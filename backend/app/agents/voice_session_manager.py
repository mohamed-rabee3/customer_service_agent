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
from livekit import agents, rtc
from livekit.agents import AgentServer, AgentSession, room_io
from livekit.agents.llm import ChatMessage
from livekit.agents.voice.events import ConversationItemAddedEvent
from livekit.plugins import elevenlabs, groq, silero
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

# Set API keys so plugins auto-discover them
from app.core.config import settings
os.environ.setdefault("GROQ_API_KEY", settings.groq_api_key)
os.environ.setdefault("ELEVEN_API_KEY", settings.elevenlabs_api_key)

logger = logging.getLogger("agent-runner")
logging.basicConfig(level=logging.INFO)

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

    # Configure the AgentSession with STT/LLM/TTS pipeline
    session = AgentSession(
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

    # Serialize whisper handling so overlapping say()/generate_reply() cannot interleave.
    whisper_lock = asyncio.Lock()

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
        label = "Customer" if item.role == "user" else "Agent"
        feed_line = f"{label}: {text}"
        transcript_lines.append(feed_line)
        if len(transcript_lines) > 100:
            transcript_lines[:] = transcript_lines[-80:]
        schedule_metrics_flush(feed_line)

    # ── Register whisper data message handler ──────────────────────────
    @ctx.room.on("data_received")
    def on_data_received(data_packet: rtc.DataPacket):
        """Handle incoming data messages (whisper instructions from supervisor)."""
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
        """Handle customer disconnection — trigger post-call processing."""
        if not participant.identity.startswith("agent-"):
            logger.info(
                f"Customer disconnected from room {ctx.room.name}. "
                "Starting post-call processing..."
            )
            asyncio.create_task(_run_post_call_once())

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
            await session.say(
                "I'm sorry — can you be with me for a second?",
                allow_interruptions=False,
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

    1. Generate conversation summary via LLM
    2. Save summary and tags to DB
    3. Update agent status to idle
    """
    try:
        from app.agents.base_agent import _get_client

        # Resolve agent_db_id from the interaction if metadata didn't carry it
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

        # Update agent status to idle
        if agent_db_id and agent_db_id != "unknown":
            update_agent_status(agent_db_id, AgentStatus.IDLE)
        else:
            logger.error("Skipping agent status update — agent_db_id unknown")

        # Update interaction status to completed
        if interaction_id:
            from app.agents.base_agent import _get_client
            from datetime import datetime, timezone

            client = _get_client()
            now_utc = datetime.now(timezone.utc)

            # ── Abandonment detection ──
            # A call is abandoned if the transcript is empty (no conversation)
            # or contains no agent replies (customer spoke but agent never responded).
            snap = transcript_lines_snapshot or []
            has_agent_reply = any(
                line.startswith("Agent:") for line in snap
            )
            is_abandoned = len(snap) == 0 or not has_agent_reply

            update_payload: dict = {
                "status": "abandoned" if is_abandoned else "completed",
                "end_at": now_utc.isoformat(),
                "is_abandoned": is_abandoned,
            }
            client.table("interactions").update(
                update_payload
            ).eq("id", interaction_id).execute()

            if is_abandoned:
                logger.info(
                    "Interaction %s marked as abandoned "
                    "(transcript_lines=%d, has_agent_reply=%s)",
                    interaction_id, len(snap), has_agent_reply,
                )
            else:
                # Only run the expensive LLM summarization for real conversations
                joined = "\n".join(snap)
                (
                    summary_text,
                    issues_list,
                    topic_tags,
                    overall_perf,
                    sentiment_groq,
                ) = await asyncio.to_thread(summarize_voice_call_groq, joined)
                save_interaction_summary(
                    interaction_id=interaction_id,
                    summary=summary_text,
                    issues=issues_list,
                    tags=topic_tags,
                )
                upsert_interaction_archive_record(
                    interaction_id=interaction_id,
                    summary=summary_text,
                    overall_performance=overall_perf,
                    sentiment=sentiment_groq,
                    issues=issues_list,
                    tags=topic_tags,
                )

        logger.info(
            f"Post-call processing complete for agent {agent_db_id}, "
            f"interaction {interaction_id}"
        )
    except Exception as e:
        logger.error(f"Post-call processing failed: {e}")


if __name__ == "__main__":
    agents.cli.run_app(server)
