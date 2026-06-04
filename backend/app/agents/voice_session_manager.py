"""
LiveKit Voice Session Manager — Entrypoint for the voice agent worker process.

This file runs as a SEPARATE PROCESS from the FastAPI backend.
It registers with LiveKit server and auto-dispatches to rooms.

Usage:
    python -m app.agents.voice_session_manager dev     # Development mode
    python -m app.agents.voice_session_manager start   # Production mode
"""

import asyncio
import json
import logging
import os

from dotenv import load_dotenv
from google.genai import types as genai_types
from livekit import agents, rtc
from livekit.agents import AgentServer, AgentSession, room_io
from livekit.agents.llm import ChatMessage
from livekit.agents.voice.events import ConversationItemAddedEvent
# Plugin imports must run at module load (main thread), not inside the job entrypoint.
from livekit.plugins import elevenlabs, groq, silero
from livekit.plugins.google.beta import realtime as google_realtime
from livekit.plugins.turn_detector.multilingual import MultilingualModel

from app.agents.base_agent import (
    _get_client,
    analyze_live_metrics_groq,
    save_interaction_summary,
    save_realtime_metrics,
    summarize_voice_call_groq,
    upsert_interaction_archive_record,
    update_agent_status,
)
from app.agents.voice_agent import CustomerServiceAgent
from app.core.constants import AgentStatus

# Load environment variables
load_dotenv()

from app.core.config import settings

logger = logging.getLogger("agent-runner")
logging.basicConfig(level=logging.INFO)

_VERTEX_SETUP_HELP = (
    "Vertex AI voice requires GOOGLE_CLOUD_PROJECT and GCP credentials. "
    "1) Enable Vertex AI API on your GCP project (uses $300 trial / GCP billing). "
    "2) Set GOOGLE_CLOUD_PROJECT and GOOGLE_CLOUD_LOCATION in backend/.env. "
    "3) Auth: GOOGLE_APPLICATION_CREDENTIALS=<service-account.json> "
    "   or run: gcloud auth application-default login"
)
_OAUTH_CLIENT_SECRET_HELP = (
    "GOOGLE_APPLICATION_CREDENTIALS points to an OAuth client secret "
    "(client_secret_*.json), not a service account key. "
    "In GCP Console: IAM & Admin → Service Accounts → your account → Keys → "
    "Add key → JSON. That file must contain \"type\": \"service_account\". "
    "Or remove GOOGLE_APPLICATION_CREDENTIALS and run: "
    "gcloud auth application-default login"
)


def _validate_vertex_credentials_file() -> str | None:
    """Return an error message if GOOGLE_APPLICATION_CREDENTIALS is the wrong JSON kind."""
    creds_path = (settings.google_application_credentials or "").strip()
    if not creds_path:
        return None
    path = os.path.abspath(creds_path)
    if not os.path.isfile(path):
        return f"Credentials file not found: {path}"
    try:
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
    except json.JSONDecodeError:
        return f"Credentials file is not valid JSON: {path}"
    cred_type = data.get("type")
    if cred_type == "service_account":
        return None
    if "web" in data or "installed" in data or "client_secret" in str(data.get("web", data)):
        return _OAUTH_CLIENT_SECRET_HELP
    if cred_type is None:
        return _OAUTH_CLIENT_SECRET_HELP
    return (
        f"Unsupported credentials type {cred_type!r} in {path}. "
        'Expected a service account JSON with "type": "service_account".'
    )


def _configure_vertex_env() -> None:
    os.environ["GOOGLE_GENAI_USE_VERTEXAI"] = "1"
    project = (settings.google_cloud_project or "").strip()
    location = (settings.google_cloud_location or "us-central1").strip()
    if project:
        os.environ["GOOGLE_CLOUD_PROJECT"] = project
    if location:
        os.environ["GOOGLE_CLOUD_LOCATION"] = location
    creds_path = (settings.google_application_credentials or "").strip()
    if creds_path:
        os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = creds_path
    for env_name in ("GOOGLE_API_KEY", "GEMINI_API_KEY"):
        if os.environ.get(env_name):
            logger.warning(
                "Clearing %s — Vertex uses GCP credentials, not AI Studio keys.",
                env_name,
            )
            os.environ.pop(env_name, None)


def _configure_ai_studio_env() -> None:
    os.environ.pop("GOOGLE_GENAI_USE_VERTEXAI", None)
    key = (settings.gemini_api_key or "").strip()
    if key:
        os.environ["GOOGLE_API_KEY"] = key
        os.environ["GEMINI_API_KEY"] = key


if settings.gemini_use_vertex:
    _configure_vertex_env()
else:
    _configure_ai_studio_env()

if settings.groq_api_key:
    os.environ.setdefault("GROQ_API_KEY", settings.groq_api_key)
if settings.elevenlabs_api_key:
    os.environ.setdefault("ELEVEN_API_KEY", settings.elevenlabs_api_key)


def _use_legacy_voice_pipeline() -> bool:
    return (settings.voice_pipeline or "gemini").strip().lower() == "legacy"


def _vertex_accessible() -> bool:
    project = (settings.google_cloud_project or "").strip()
    if not project:
        logger.error("GOOGLE_CLOUD_PROJECT is not set.")
        return False
    creds_err = _validate_vertex_credentials_file()
    if creds_err:
        logger.error("%s", creds_err)
        return False
    location = (settings.google_cloud_location or "us-central1").strip()
    try:
        from google import genai

        client = genai.Client(vertexai=True, project=project, location=location)
        client.models.generate_content(
            model=settings.gemini_vertex_healthcheck_model,
            contents="ping",
        )
        return True
    except Exception as e:
        err = str(e)
        if "valid type" in err or "service_account" in err:
            logger.error("%s Details: %s", _OAUTH_CLIENT_SECRET_HELP, err[:300])
        elif "NOT_FOUND" in err and "Publisher Model" in err:
            logger.error(
                "Vertex AI health check model %r not found in %s. "
                "Set GEMINI_VERTEX_HEALTHCHECK_MODEL (e.g. gemini-2.5-flash) "
                "or enable Vertex AI API on the project. Details: %s",
                settings.gemini_vertex_healthcheck_model,
                location,
                err[:300],
            )
        else:
            logger.error("Vertex AI check failed: %s", err[:500])
        return False


def _ai_studio_accessible() -> bool:
    key = (settings.gemini_api_key or "").strip()
    if not key:
        logger.error("GEMINI_API_KEY is not set (GEMINI_USE_VERTEX=false).")
        return False
    try:
        from google import genai

        client = genai.Client(api_key=key)
        client.models.generate_content(model="gemini-2.0-flash", contents="ping")
        return True
    except Exception as e:
        logger.error("Gemini API check failed: %s", str(e)[:500])
        return False


def _build_realtime_model() -> google_realtime.RealtimeModel:
    transcription = genai_types.AudioTranscriptionConfig()
    common = dict(
        model=settings.gemini_realtime_model,
        voice=settings.gemini_voice,
        temperature=0.6,
        input_audio_transcription=transcription,
        output_audio_transcription=transcription,
    )
    if settings.gemini_use_vertex:
        return google_realtime.RealtimeModel(
            **common,
            vertexai=True,
            project=settings.google_cloud_project,
            location=settings.google_cloud_location or "us-central1",
        )
    return google_realtime.RealtimeModel(
        **common,
        vertexai=False,
        api_key=settings.gemini_api_key,
    )


def _build_agent_session() -> AgentSession:
    if _use_legacy_voice_pipeline():
        logger.info("Voice pipeline: legacy (Groq + ElevenLabs)")
        return AgentSession(
            stt=groq.STT(
                model="whisper-large-v3-turbo",
                api_key=settings.groq_api_key,
                language="en",
            ),
            llm=groq.LLM(
                model="openai/gpt-oss-120b",
                api_key=settings.groq_api_key,
                temperature=0.6,
            ),
            tts=elevenlabs.TTS(
                voice_id=settings.elevenlabs_voice_id,
                model=settings.elevenlabs_model,
                api_key=settings.elevenlabs_api_key,
                streaming_latency=4,
                enable_ssml_parsing=False,
            ),
            vad=silero.VAD.load(),
            turn_detection=MultilingualModel(),
        )

    if settings.gemini_use_vertex and not _vertex_accessible():
        raise RuntimeError(_VERTEX_SETUP_HELP)
    if not settings.gemini_use_vertex and not _ai_studio_accessible():
        raise RuntimeError("GEMINI_API_KEY invalid or blocked.")

    backend = "Vertex AI" if settings.gemini_use_vertex else "AI Studio"
    logger.info(
        "Voice pipeline: gemini realtime (%s, model=%s)",
        backend,
        settings.gemini_realtime_model,
    )
    return AgentSession(llm=_build_realtime_model())


if not _use_legacy_voice_pipeline():
    if settings.gemini_use_vertex:
        creds_err = _validate_vertex_credentials_file()
        if creds_err:
            raise SystemExit(creds_err)
        if not _vertex_accessible():
            raise SystemExit(_VERTEX_SETUP_HELP)
        logger.info(
            "Voice worker ready: Vertex AI project=%s location=%s model=%s",
            settings.google_cloud_project,
            settings.google_cloud_location,
            settings.gemini_realtime_model,
        )
    elif not _ai_studio_accessible():
        raise SystemExit("GEMINI_API_KEY invalid. Set GEMINI_USE_VERTEX=true for GCP billing.")

# Create the agent server
server = AgentServer()


@server.rtc_session(agent_name="customer-service-agent")
async def entrypoint(ctx: agents.JobContext):
    """
    Main entrypoint for the customer service voice agent.

    This function is called when a new LiveKit room is created and dispatched
    to this agent server. It:
    1. Extracts agent config from room metadata
    2. Creates the CustomerServiceAgent with the system prompt
    3. Sets up the AgentSession with STT/LLM/TTS/VAD
    4. Registers whisper data message handler
    5. Starts the session and greets the customer
    """
    logger.info(f"Agent dispatched to room: {ctx.room.name}")

    # Extract metadata — prefer dispatch metadata (ctx.job.metadata), which is
    # what CreateAgentDispatchRequest sets. Fall back to room metadata.
    room_metadata: dict = {}
    raw_meta = ""
    try:
        raw_meta = (ctx.job.metadata or "") if getattr(ctx, "job", None) else ""
    except Exception:
        raw_meta = ""
    if not raw_meta and ctx.room.metadata:
        raw_meta = ctx.room.metadata
    if raw_meta:
        try:
            room_metadata = json.loads(raw_meta)
        except json.JSONDecodeError:
            logger.warning("Failed to parse agent/room metadata: %r", raw_meta[:200])

    logger.info(f"Agent metadata parsed: keys={list(room_metadata.keys())}")

    agent_db_id = room_metadata.get("agent_db_id", "unknown")
    interaction_type = room_metadata.get("interaction_type", "voice")
    system_prompt = room_metadata.get(
        "system_prompt",
        "You are a helpful customer service agent. Be polite, concise, and helpful.",
    )

    # interaction_id: DB row for this room is authoritative (call_source_id == room).
    # Dispatch metadata can disagree with DB on some LiveKit paths; using metadata alone
    # wrote realtime_metrics to the wrong interaction_id (dashboard showed no metrics).
    meta_interaction_id = (room_metadata.get("interaction_id") or "").strip()
    interaction_id = ""

    client = _get_client()
    for attempt in range(40):
        try:
            result = (
                client.table("interactions")
                .select("id")
                .eq("call_source_id", ctx.room.name)
                .limit(1)
                .execute()
            )
            if result.data:
                interaction_id = str(result.data[0]["id"]).strip()
                logger.info(
                    "Resolved interaction_id=%s for room %s (attempt %s)",
                    interaction_id,
                    ctx.room.name,
                    attempt,
                )
                break
        except Exception as e:
            logger.warning(
                "Interaction lookup for room %s: %s", ctx.room.name, e
            )
        await asyncio.sleep(0.25)

    if not interaction_id and meta_interaction_id:
        interaction_id = meta_interaction_id
        logger.info(
            "Using interaction_id from dispatch metadata for room %s (no DB row yet)",
            ctx.room.name,
        )

    if (
        interaction_id
        and meta_interaction_id
        and interaction_id != meta_interaction_id
    ):
        logger.warning(
            "interaction_id metadata (%s…) != DB (%s…) for room %s — using DB id",
            meta_interaction_id[:8],
            interaction_id[:8],
            ctx.room.name,
        )

    if not interaction_id:
        logger.error(
            "No interaction_id for room %s — supervisor live metrics will not be saved",
            ctx.room.name,
        )

    # Create the agent with system prompt and identifiers
    agent = CustomerServiceAgent(
        system_prompt=system_prompt,
        agent_db_id=agent_db_id,
        interaction_id=str(interaction_id) if interaction_id else "",
    )

    session = _build_agent_session()

    # Serialize whisper handling so overlapping say()/generate_reply() cannot interleave.
    whisper_lock = asyncio.Lock()

    # Three-way barge-in state. When a supervisor joins the call, the AI agent
    # stays in the room and keeps listening (transcribing) but its audio output
    # is muted so it does not talk over the human. Handing the call back un-mutes
    # it and prompts it to resume.
    barge_state: dict[str, bool] = {"muted": False}

    async def _resume_after_handback() -> None:
        """Re-engage the agent after the supervisor hands the call back."""
        async with whisper_lock:
            try:
                await session.generate_reply(
                    instructions=(
                        "The supervisor has handed the call back to you. Briefly "
                        "acknowledge and continue helping the customer from where the "
                        "conversation left off. Do not mention supervisors or that you "
                        "were muted."
                    )
                )
            except Exception as e:
                logger.warning("Resume-after-handback reply failed: %s", e)

    # ── Live supervisor metrics (transcript line + Groq analysis) ─────
    transcript_lines: list[str] = []
    monitor_state: dict[str, asyncio.Task | None] = {"task": None}

    def schedule_metrics_flush(latest_feed_line: str) -> None:
        if not interaction_id:
            return
        prev = monitor_state.get("task")
        if prev is not None and not prev.done():
            prev.cancel()
        lines_snapshot = list(transcript_lines)

        async def _flush() -> None:
            try:
                await asyncio.sleep(1.4)
            except asyncio.CancelledError:
                return
            if not interaction_id:
                return
            window = "\n".join(lines_snapshot[-60:])
            line = latest_feed_line.strip()
            if not line:
                return
            try:
                perf, sent = await asyncio.to_thread(analyze_live_metrics_groq, window)
                save_realtime_metrics(
                    interaction_id=str(interaction_id),
                    sentiment=sent,
                    satisfaction_score=perf,
                    feed_text=line[:8000],
                )
            except Exception as e:
                logger.warning("Live metrics flush failed: %s", e)

        monitor_state["task"] = asyncio.create_task(_flush())

    @session.on("conversation_item_added")
    def on_conversation_item(ev: ConversationItemAddedEvent) -> None:
        item = ev.item
        if not isinstance(item, ChatMessage):
            return
        if item.role not in ("user", "assistant"):
            return
        text = (item.text_content or "").strip()
        if not text:
            return
        # While the supervisor has barged in, the agent's output is muted — the
        # customer never hears these replies, so don't surface them in the feed.
        if item.role == "assistant" and barge_state["muted"]:
            return
        label = "Customer" if item.role == "user" else "Agent"
        feed_line = f"{label}: {text}"
        transcript_lines.append(feed_line)
        if len(transcript_lines) > 100:
            transcript_lines[:] = transcript_lines[-80:]
        schedule_metrics_flush(feed_line)

    # ── Register data message handler (whisper + barge-in mute/un-mute) ─
    @ctx.room.on("data_received")
    def on_data_received(data_packet: rtc.DataPacket):
        """Handle incoming data messages from the supervisor.

        Topics:
          - ``whisper``      : coaching instructions merged into the agent prompt.
          - ``agent_mute``   : supervisor barged in — interrupt + mute agent audio
                               output (the agent keeps listening for context).
          - ``agent_unmute`` : supervisor handed the call back — un-mute and resume.
        """
        if data_packet.topic == "whisper":
            try:
                whisper_data = json.loads(data_packet.data.decode("utf-8"))
                instructions = whisper_data.get("instructions", "")

                logger.info(
                    f"Whisper received for agent {agent_db_id}: "
                    f"{instructions[:100]}..."
                )

                # Put the customer on hold and process instructions
                asyncio.create_task(
                    _handle_whisper(
                        session,
                        agent,
                        instructions,
                        agent_db_id,
                        whisper_lock,
                    )
                )

            except Exception as e:
                logger.error(f"Failed to process whisper: {e}")

        elif data_packet.topic == "agent_mute":
            logger.info(f"Supervisor barged in — muting agent {agent_db_id} audio output")
            barge_state["muted"] = True
            try:
                session.interrupt()
            except Exception as e:
                logger.warning(f"interrupt() on barge-in failed: {e}")
            try:
                session.output.set_audio_enabled(False)
            except Exception as e:
                logger.error(f"Failed to mute agent output: {e}")

        elif data_packet.topic == "agent_unmute":
            logger.info(f"Supervisor handed call back — un-muting agent {agent_db_id}")
            barge_state["muted"] = False
            try:
                session.output.set_audio_enabled(True)
            except Exception as e:
                logger.error(f"Failed to un-mute agent output: {e}")
            asyncio.create_task(_resume_after_handback())

    # ── Handle participant disconnect (end of interaction) ─────────────
    post_call_done = False

    async def _run_post_call_once() -> None:
        nonlocal post_call_done
        if post_call_done:
            return
        post_call_done = True
        snap = list(transcript_lines)
        await _handle_post_call(session, agent_db_id, interaction_id, snap)

    @ctx.room.on("participant_disconnected")
    def on_participant_disconnected(participant: rtc.RemoteParticipant):
        """Handle customer disconnection — trigger post-call processing.

        Only the customer leaving ends the call. A supervisor (identity = UUID)
        joining to monitor/barge-in and then leaving must NOT terminate the call,
        so we match the customer identity prefix explicitly rather than "not agent".
        """
        if participant.identity.startswith("customer-"):
            logger.info(
                f"Customer disconnected from room {ctx.room.name}. "
                "Starting post-call processing..."
            )
            asyncio.create_task(_run_post_call_once())
        else:
            logger.info(
                f"Non-customer participant '{participant.identity}' left room "
                f"{ctx.room.name} — call continues."
            )

    # Shutdown callback — awaited by the runtime, so DB writes always complete
    # even if the room tears down immediately after the customer hangs up.
    ctx.add_shutdown_callback(_run_post_call_once)

    # ── Start the agent session ────────────────────────────────────────
    await session.start(
        room=ctx.room,
        agent=agent,
        room_options=room_io.RoomOptions(
            audio_input=room_io.AudioInputOptions(
                # No noise cancellation for simplicity (can add later)
            ),
        ),
    )

    logger.info(f"Agent session started for agent {agent_db_id} in room {ctx.room.name}")

    # Generate initial greeting
    await session.generate_reply(
        instructions="Greet the customer warmly and ask how you can help them today. "
        "Be friendly and professional."
    )


async def _handle_whisper(
    session: AgentSession,
    agent: CustomerServiceAgent,
    instructions: str,
    agent_db_id: str,
    lock: asyncio.Lock,
) -> None:
    """
    Handle whisper instructions from supervisor.

    1. Say a brief apology / hold line to the customer
    2. Merge supervisor text into the agent instructions (persistent behavior)
    3. Continue the conversation from where it left off
    """
    text = (instructions or "").strip()
    if not text:
        logger.warning("Whisper ignored — empty instructions")
        update_agent_status(agent_db_id, AgentStatus.IN_CALL)
        return

    async with lock:
        try:
            if _use_legacy_voice_pipeline():
                await session.say(
                    "I'm sorry — can you be with me for a second?",
                    allow_interruptions=False,
                )
            else:
                await session.generate_reply(
                    instructions=(
                        "Politely ask the customer to wait one moment. "
                        "Keep it brief; do not mention supervisors."
                    )
                )

            current = agent.instructions or ""
            merged = (
                current.rstrip()
                + "\n\n[Supervisor coaching for the rest of this call — "
                "never mention coaching or supervisors to the customer]: "
                + text
            )
            await agent.update_instructions(merged)

            await session.generate_reply(
                instructions=(
                    "Continue naturally from exactly where the conversation paused. "
                    "Pick up the customer's last topic or question. "
                    "Apply the new supervisor coaching silently. "
                    "Do not apologize again or mention waiting, supervisors, or instructions."
                )
            )

            update_agent_status(agent_db_id, AgentStatus.IN_CALL)

            logger.info(f"Whisper processed for agent {agent_db_id}")
        except Exception as e:
            logger.error(f"Failed to handle whisper for agent {agent_db_id}: {e}")
            update_agent_status(agent_db_id, AgentStatus.IN_CALL)


async def _handle_post_call(
    session: AgentSession,
    agent_db_id: str,
    interaction_id: str,
    transcript_lines_snapshot: list[str] | None = None,
) -> None:
    """
    Handle post-call processing after customer disconnects.

    Steps (each wrapped independently so a single failure cannot
    poison the whole pipeline):
      1. Resolve ``agent_db_id`` from the interaction row if missing.
      2. Flip the agent row to ``IDLE``.
      3. Mark the interaction ``completed`` / ``abandoned`` and stamp ``end_at``.
      4. Run the LLM summarizer and persist summary + archive row.

    The previous implementation wrapped everything in a single bare
    ``except Exception`` that silently returned on the first error —
    see migration 009 for context on the enum mismatch this caused.
    """
    from datetime import datetime, timezone

    from app.agents.base_agent import _get_client
    from app.core.constants import InteractionStatus

    # ── 1. Resolve agent_db_id (best effort) ──
    if (not agent_db_id or agent_db_id == "unknown") and interaction_id:
        try:
            client = _get_client()
            row = (
                client.table("interactions")
                .select("agent_id")
                .eq("id", interaction_id)
                .limit(1)
                .execute()
            )
            if row.data:
                agent_db_id = row.data[0]["agent_id"]
                logger.info(f"Resolved agent_db_id from interaction: {agent_db_id}")
        except Exception as e:
            logger.warning(f"Could not resolve agent_db_id: {e}")

    # ── 2. Flip agent to IDLE (best effort) ──
    if agent_db_id and agent_db_id != "unknown":
        try:
            update_agent_status(agent_db_id, AgentStatus.IDLE)
        except Exception as e:
            logger.error(f"Failed to set agent {agent_db_id} IDLE: {e}")
    else:
        logger.error("Skipping agent status update — agent_db_id unknown")

    # ── 3. Mark interaction completed/abandoned (best effort) ──
    if not interaction_id:
        logger.error(
            "Post-call: interaction_id is empty — cannot write status/end_at. "
            "Agent %s flipped to IDLE but the call is orphaned.",
            agent_db_id,
        )
        return

    snap = transcript_lines_snapshot or []
    has_agent_reply = any(line.startswith("Agent:") for line in snap)
    is_abandoned = len(snap) == 0 or not has_agent_reply
    final_status = (
        InteractionStatus.ABANDONED.value
        if is_abandoned
        else InteractionStatus.COMPLETED.value
    )

    try:
        now_utc = datetime.now(timezone.utc)
        client = _get_client()
        client.table("interactions").update({
            "status": final_status,
            "end_at": now_utc.isoformat(),
            "is_abandoned": is_abandoned,
        }).eq("id", interaction_id).execute()
        logger.info(
            "Interaction %s marked %s "
            "(transcript_lines=%d, has_agent_reply=%s)",
            interaction_id, final_status, len(snap), has_agent_reply,
        )
    except Exception as e:
        logger.error(
            "Post-call: failed to update interaction %s status to %s: %s",
            interaction_id, final_status, e,
        )

    # ── 4. LLM summary + archive upsert (best effort, abandoned calls skipped) ──
    if is_abandoned:
        logger.info(
            "Skipping LLM summary for abandoned interaction %s", interaction_id,
        )
        return

    try:
        joined = "\n".join(snap)
        (
            summary_text,
            issues_list,
            topic_tags,
            overall_perf,
            sentiment_groq,
        ) = await asyncio.to_thread(summarize_voice_call_groq, joined)
    except Exception as e:
        logger.error(
            "Post-call: Groq summarization failed for %s: %s", interaction_id, e,
        )
        return

    try:
        save_interaction_summary(
            interaction_id=interaction_id,
            summary=summary_text,
            issues=issues_list,
            tags=topic_tags,
        )
    except Exception as e:
        logger.error(
            "Post-call: failed to save summary for %s: %s", interaction_id, e,
        )

    try:
        upsert_interaction_archive_record(
            interaction_id=interaction_id,
            summary=summary_text,
            overall_performance=overall_perf,
            sentiment=sentiment_groq,
            issues=issues_list,
            tags=topic_tags,
        )
    except Exception as e:
        logger.error(
            "Post-call: failed to upsert archive for %s: %s", interaction_id, e,
        )

    logger.info(
        "Post-call processing finished for agent %s, interaction %s "
        "(status=%s, transcript_lines=%d)",
        agent_db_id, interaction_id, final_status, len(snap),
    )


if __name__ == "__main__":
    agents.cli.run_app(server)
