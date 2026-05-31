"""Whisper service for sending instructions to agents during interactions."""

import logging
from datetime import datetime, timezone
from uuid import UUID, uuid4

from app.core.constants import AgentStatus
from app.core.exceptions import NotFoundException, ValidationException
from app.livekit import room_manager
from app.repositories.agent_repository import AgentRepository
from app.repositories.interaction_repository import InteractionRepository

logger = logging.getLogger(__name__)


class WhisperService:
    """Service for whisper/instruction injection to agents."""

    def __init__(self):
        self.agent_repo = AgentRepository()
        self.interaction_repo = InteractionRepository()

    async def send_whisper(
        self,
        agent_id: UUID,
        supervisor_id: UUID,
        instructions: str,
    ) -> dict:
        """
        Send whisper instructions to an agent during an active interaction.

        Flow:
        1. Validate agent is in active call/chat and not already paused
        2. Update agent status to paused
        3. Send data message to LiveKit room
        4. Return whisper response

        Args:
            agent_id: Agent to whisper to
            supervisor_id: Supervisor performing the whisper
            instructions: Instructions text

        Returns:
            Whisper response dict
        """
        # Validate agent belongs to supervisor
        agent = self.agent_repo.get_by_id_and_supervisor(agent_id, supervisor_id)
        if not agent:
            raise NotFoundException(f"Agent {agent_id} not found")

        # Check agent is in active interaction
        active_statuses = {AgentStatus.IN_CALL, AgentStatus.IN_CHAT}
        if agent.status not in active_statuses:
            if agent.status == AgentStatus.PAUSED:
                raise ValidationException("Agent is already paused")
            raise ValidationException("Agent is not in active call or chat")

        # Get the active interaction to find the room
        interaction = self.interaction_repo.get_active_by_agent(agent_id)
        if not interaction:
            raise ValidationException("Agent has no active interaction")

        whisper_id = str(uuid4())
        paused_at = datetime.now(timezone.utc)

        room_name = await room_manager.resolve_livekit_room_name(
            interaction.call_source_id,
            agent_id=str(agent_id),
            interaction_id=str(interaction.id),
        )
        if not room_name:
            raise ValidationException(
                "No LiveKit room linked to this interaction. "
                "Ensure the mock call is connected and LIVEKIT_URL matches the voice worker."
            )

        whisper_data = {
            "whisper_id": whisper_id,
            "instructions": instructions,
            "paused_at": paused_at.isoformat(),
        }
        try:
            await room_manager.send_data_to_room(
                room_name=room_name,
                data=whisper_data,
                topic="whisper",
            )
        except Exception as e:
            raise ValidationException(
                f"Could not deliver whisper to LiveKit room '{room_name}'. "
                "Confirm the customer mock call is connected and the voice worker "
                f"uses the same LIVEKIT_URL as the API. ({e})"
            ) from e

        # Pause only after LiveKit delivery succeeds
        self.agent_repo.update_status(agent_id, AgentStatus.PAUSED)

        acknowledged_at = datetime.now(timezone.utc)

        logger.info(
            f"Whisper {whisper_id} sent to agent {agent_id} in room {room_name}"
        )

        return {
            "whisper_id": whisper_id,
            "agent_id": str(agent_id),
            "agent_status": "paused",
            "paused_at": paused_at.isoformat(),
            "instructions_sent": True,
            "acknowledged": True,
            "acknowledged_at": acknowledged_at.isoformat(),
            "resumed_at": None,
        }
