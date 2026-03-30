"""
LiveKit Agent Runner — Entrypoint for the voice agent worker process.

This file runs as a SEPARATE PROCESS from the FastAPI backend.
It registers with LiveKit server and auto-dispatches to rooms.

Usage:
    python -m app.agents.agent_runner dev     # Development mode
    python -m app.agents.agent_runner start   # Production mode
"""

import json
import logging
import os

from dotenv import load_dotenv
from livekit import agents, rtc
from livekit.agents import AgentServer, AgentSession, room_io
from livekit.plugins import google, groq, silero
from livekit.plugins.turn_detector.multilingual import MultilingualModel

from app.agents.base_agent import update_agent_status, save_interaction_summary
from app.agents.voice_agent import CustomerServiceAgent
from app.core.constants import AgentStatus

# Load environment variables
load_dotenv()

# Set API keys so plugins auto-discover them
from app.core.config import settings
os.environ.setdefault("GOOGLE_API_KEY", settings.gemini_api_key)
os.environ.setdefault("GROQ_API_KEY", settings.groq_api_key)

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

    # Extract metadata from the room
    room_metadata = {}
    if ctx.room.metadata:
        try:
            room_metadata = json.loads(ctx.room.metadata)
        except json.JSONDecodeError:
            logger.warning("Failed to parse room metadata")

    agent_db_id = room_metadata.get("agent_db_id", "unknown")
    interaction_type = room_metadata.get("interaction_type", "voice")
    system_prompt = room_metadata.get(
        "system_prompt",
        "You are a helpful customer service agent. Be polite, concise, and helpful.",
    )

    # Find the interaction_id from the room name or metadata
    interaction_id = room_metadata.get("interaction_id", "")
    if not interaction_id:
        # Try to find from DB based on call_source_id (room name)
        try:
            from app.agents.base_agent import _get_client

            client = _get_client()
            result = (
                client.table("interactions")
                .select("id")
                .eq("call_source_id", ctx.room.name)
                .limit(1)
                .execute()
            )
            if result.data:
                interaction_id = result.data[0]["id"]
        except Exception as e:
            logger.warning(f"Could not find interaction for room {ctx.room.name}: {e}")

    # Create the agent with system prompt and identifiers
    agent = CustomerServiceAgent(
        system_prompt=system_prompt,
        agent_db_id=agent_db_id,
        interaction_id=interaction_id,
    )

    # Configure the AgentSession with STT/LLM/TTS pipeline
    session = AgentSession(
        stt=groq.STT(
            model="whisper-large-v3-turbo",
            api_key=settings.groq_api_key,
            language="en",
        ),
        llm=google.LLM(model="gemini-2.5-flash"),
        tts=groq.TTS(
            model="canopylabs/orpheus-v1-english",
            voice="autumn",
            api_key=settings.groq_api_key,
        ),
        vad=silero.VAD.load(),
        turn_detection=MultilingualModel(),
    )

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
                ctx.create_task(_handle_whisper(session, instructions, agent_db_id))

            except Exception as e:
                logger.error(f"Failed to process whisper: {e}")

    # ── Handle participant disconnect (end of interaction) ─────────────
    @ctx.room.on("participant_disconnected")
    def on_participant_disconnected(participant: rtc.RemoteParticipant):
        """Handle customer disconnection — trigger post-call processing."""
        if not participant.identity.startswith("agent-"):
            logger.info(
                f"Customer disconnected from room {ctx.room.name}. "
                "Starting post-call processing..."
            )
            ctx.create_task(
                _handle_post_call(session, agent_db_id, interaction_id)
            )

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
    instructions: str,
    agent_db_id: str,
) -> None:
    """
    Handle whisper instructions from supervisor.

    1. Say "Please hold" to customer
    2. Inject instructions into the agent's context
    3. Resume conversation
    """
    try:
        # Politely put the customer on hold
        await session.say(
            "Please hold one moment while I check something for you.",
            allow_interruptions=False,
        )

        # Process the whisper instructions — generate a new response
        # based on the supervisor's guidance
        await session.generate_reply(
            instructions=f"[SUPERVISOR INSTRUCTION]: {instructions}. "
            "Take this into account for your next response. "
            "Do not mention the supervisor or that you received instructions."
        )

        # Resume agent status
        update_agent_status(agent_db_id, AgentStatus.IN_CALL)

        logger.info(f"Whisper processed for agent {agent_db_id}")
    except Exception as e:
        logger.error(f"Failed to handle whisper for agent {agent_db_id}: {e}")


async def _handle_post_call(
    session: AgentSession,
    agent_db_id: str,
    interaction_id: str,
) -> None:
    """
    Handle post-call processing after customer disconnects.

    1. Generate conversation summary via LLM
    2. Save summary and tags to DB
    3. Update agent status to idle
    """
    try:
        # Update agent status to idle
        update_agent_status(agent_db_id, AgentStatus.IDLE)

        # Update interaction status to completed
        if interaction_id:
            from app.agents.base_agent import _get_client
            from datetime import datetime, timezone

            client = _get_client()
            client.table("interactions").update({
                "status": "completed",
                "end_at": datetime.now(timezone.utc).isoformat(),
            }).eq("id", interaction_id).execute()

            # Generate summary (simplified — in production, use the chat context)
            save_interaction_summary(
                interaction_id=interaction_id,
                summary="Call completed. Summary to be generated.",
                issues={"items": []},
                tags={"categories": []},
            )

        logger.info(
            f"Post-call processing complete for agent {agent_db_id}, "
            f"interaction {interaction_id}"
        )
    except Exception as e:
        logger.error(f"Post-call processing failed: {e}")


if __name__ == "__main__":
    agents.cli.run_app(server)
