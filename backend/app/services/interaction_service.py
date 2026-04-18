"""Interaction service with business logic."""

import json
import logging
from uuid import UUID, uuid4

from app.core.config import settings
from app.core.constants import AgentStatus, InteractionStatus, InteractionType
from app.core.exceptions import NotFoundException, ValidationException
from app.livekit import room_manager, token_service
from app.repositories.agent_repository import AgentRepository
from app.repositories.interaction_repository import InteractionRepository

logger = logging.getLogger(__name__)


class InteractionService:
    """Service for interaction business logic."""

    def __init__(self):
        self.interaction_repo = InteractionRepository()
        self.agent_repo = AgentRepository()

    async def create_interaction(
        self,
        interaction_type: InteractionType,
        phone_number: str | None = None,
    ):
        """
        Create a new interaction.

        Flow:
        1. Find an idle agent of the matching type
        2. Create a LiveKit room
        3. Generate customer access token
        4. Create interaction record in DB
        5. Update agent status to in_call/in_chat

        Returns:
            dict with interaction_id, agent, livekit_token, livekit_url
        """
        # Determine agent type from interaction type
        from app.core.constants import AgentType

        agent_type = AgentType(interaction_type.value)

        # Find an idle agent
        agent = self.agent_repo.find_idle_agent(agent_type)
        if not agent:
            raise ValidationException("No idle agents available")

        # Generate room name
        room_name = f"interaction-{uuid4().hex[:12]}"

        # Create LiveKit room with metadata
        room_metadata = {
            "agent_db_id": str(agent.id),
            "system_prompt": agent.system_prompt,
            "interaction_type": interaction_type.value,
            "mcp_tools": agent.mcp_tools,
        }
        await room_manager.create_room(room_name, metadata=room_metadata)

        # Dispatch the agent to join the room
        from livekit import api as lk_api
        from app.livekit.client import get_livekit_api
        lk = get_livekit_api()
        await lk.agent_dispatch.create_dispatch(
            lk_api.CreateAgentDispatchRequest(
                room=room_name,
                agent_name="customer-service-agent",
                metadata=json.dumps(room_metadata),
            )
        )

        # Generate customer token
        customer_identity = f"customer-{uuid4().hex[:8]}"
        customer_token = token_service.generate_customer_token(
            room_name=room_name,
            participant_identity=customer_identity,
        )

        # Create interaction record
        interaction_data = {
            "agent_id": str(agent.id),
            "interaction_type": interaction_type.value,
            "status": InteractionStatus.ACTIVE.value,
            "phone_number": phone_number,
            "call_source_id": room_name,
        }

        try:
            response = (
                self.interaction_repo.client.table("interactions")
                .insert(interaction_data)
                .execute()
            )
            if not response.data:
                # Cleanup room on failure
                await room_manager.delete_room(room_name)
                raise Exception("Failed to create interaction record")

            interaction = response.data[0]

            # Update agent status
            new_status = (
                AgentStatus.IN_CALL
                if interaction_type == InteractionType.VOICE
                else AgentStatus.IN_CHAT
            )
            self.agent_repo.update_status(agent.id, new_status)

            logger.info(
                f"Created interaction {interaction['id']} "
                f"with agent {agent.id} in room {room_name}"
            )

            return {
                "interaction_id": interaction["id"],
                "agent": agent,
                "livekit_token": customer_token,
                "livekit_url": settings.livekit_url,
            }

        except ValidationException:
            raise
        except Exception as e:
            # Cleanup room on failure
            await room_manager.delete_room(room_name)
            raise Exception(f"Failed to create interaction: {e}") from e

    def list_interactions(
        self,
        supervisor_id: UUID,
        status: InteractionStatus | None = None,
        agent_id: UUID | None = None,
        page: int = 1,
        limit: int = 20,
    ):
        """List interactions for a supervisor's agents with pagination."""
        # Get supervisor's agents
        agents = self.agent_repo.get_by_supervisor(supervisor_id)
        if not agents:
            return {"interactions": [], "total": 0, "page": page, "limit": limit}

        # Filter by specific agent if provided
        if agent_id:
            agent_ids = [a.id for a in agents if a.id == agent_id]
            if not agent_ids:
                raise NotFoundException(f"Agent {agent_id} not found")
        else:
            agent_ids = [a.id for a in agents]

        skip = (page - 1) * limit
        interactions = self.interaction_repo.get_by_supervisor_agents(
            agent_ids=agent_ids,
            status=status,
            skip=skip,
            limit=limit,
        )
        total = self.interaction_repo.count_by_filter(
            agent_ids=agent_ids,
            status=status,
        )

        return {
            "interactions": interactions,
            "total": total,
            "page": page,
            "limit": limit,
        }

    def get_interaction(self, interaction_id: UUID):
        """Get interaction details."""
        interaction = self.interaction_repo.get_by_id(interaction_id)
        if not interaction:
            raise NotFoundException(f"Interaction {interaction_id} not found")
        return interaction

    def get_interaction_detail(self, interaction_id: UUID):
        """Get interaction with metrics and permissions."""
        interaction = self.get_interaction(interaction_id)

        # Get realtime metrics
        try:
            metrics_response = (
                self.interaction_repo.client.table("realtime_metrics")
                .select("*")
                .eq("interaction_id", str(interaction_id))
                .order("timestamp", desc=True)
                .execute()
            )
            metrics = metrics_response.data
        except Exception:
            metrics = []

        # Get tool permissions
        try:
            perms_response = (
                self.interaction_repo.client.table("tool_permissions")
                .select("*")
                .eq("interaction_id", str(interaction_id))
                .execute()
            )
            permissions = perms_response.data
        except Exception:
            permissions = []

        return {
            "interaction": interaction,
            "realtime_metrics": metrics,
            "tool_permissions": permissions,
        }

    async def update_interaction(
        self,
        interaction_id: UUID,
        status: InteractionStatus | None = None,
        phone_number: str | None = None,
    ):
        """
        Update interaction status or phone number.

        On completion/failure:
        - Update agent status back to idle
        - Delete LiveKit room
        """
        interaction = self.get_interaction(interaction_id)

        update_data = {}
        if phone_number is not None:
            update_data["phone_number"] = phone_number
        if status is not None:
            update_data["status"] = status.value
            if status in (InteractionStatus.COMPLETED, InteractionStatus.FAILED):
                from datetime import datetime, timezone

                update_data["end_at"] = datetime.now(timezone.utc).isoformat()

        if not update_data:
            return interaction

        try:
            response = (
                self.interaction_repo.client.table("interactions")
                .update(update_data)
                .eq("id", str(interaction_id))
                .execute()
            )
            if not response.data:
                raise NotFoundException(f"Interaction {interaction_id} not found")

            from app.models.interaction import Interaction

            updated = Interaction.model_validate(response.data[0])

            # If interaction ended, reset agent and cleanup room
            if status in (InteractionStatus.COMPLETED, InteractionStatus.FAILED):
                self.agent_repo.update_status(
                    interaction.agent_id, AgentStatus.IDLE
                )
                if interaction.call_source_id:
                    await room_manager.delete_room(interaction.call_source_id)
                logger.info(
                    f"Interaction {interaction_id} ended with status {status.value}"
                )

            return updated

        except NotFoundException:
            raise
        except Exception as e:
            raise Exception(f"Failed to update interaction: {e}") from e
