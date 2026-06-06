"""Interaction service with business logic."""

import asyncio
import json
import logging
from datetime import datetime, timedelta, timezone
from uuid import UUID, uuid4

from app.core.config import settings
from app.core.constants import (
    AgentStatus,
    AgentType,
    InteractionStatus,
    InteractionType,
    SUPERVISOR_MONITORING_PRESENCE_TTL_SECONDS,
)
from app.core.supervisor_scope import agent_type_for_supervisor_id
from app.core.exceptions import NotFoundException, ValidationException
from app.livekit import room_manager, token_service
from app.repositories.agent_repository import AgentRepository
from app.repositories.interaction_repository import InteractionRepository
from app.db.supabase import run_supabase_request
from app.repositories.supervisor_repository import supervisor_repository

logger = logging.getLogger(__name__)

LIVEKIT_START_TIMEOUT_SECONDS = 30.0


def _create_interaction_db_record(
    interaction_repo: InteractionRepository,
    interaction_data: dict,
) -> dict:
    response = (
        interaction_repo.client.table("interactions")
        .insert(interaction_data)
        .execute()
    )
    if not response.data:
        raise Exception("Failed to create interaction record")
    return response.data[0]


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
        1. Find an idle agent of the matching type whose supervisor is actively
           monitoring (recent dashboard activity; see supervisor presence TTL).
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

        cutoff = datetime.now(timezone.utc) - timedelta(
            seconds=SUPERVISOR_MONITORING_PRESENCE_TTL_SECONDS
        )

        def _find_agent() -> tuple[list[UUID], object | None]:
            def _query() -> tuple[list[UUID], object | None]:
                ids = supervisor_repository.list_user_ids_active_since(cutoff)
                found = self.agent_repo.find_idle_agent_for_supervisors(
                    agent_type, ids
                )
                return ids, found

            return run_supabase_request(_query)

        active_supervisor_ids, agent = await asyncio.to_thread(_find_agent)
        if not agent:
            if not active_supervisor_ids:
                raise ValidationException(
                    "No supervisor is actively monitoring. "
                    "Keep the supervisor dashboard open while accepting mock calls."
                )
            raise ValidationException(
                "No idle agents available for supervisors who are monitoring."
            )

        # Generate room name (stored on interaction before LiveKit starts so the
        # agent worker always resolves interaction_id — avoids race where dispatch
        # ran before the DB row existed and live metrics never saved).
        room_name = f"interaction-{uuid4().hex[:12]}"

        interaction_data = {
            "agent_id": str(agent.id),
            "interaction_type": interaction_type.value,
            "status": InteractionStatus.ACTIVE.value,
            "phone_number": phone_number,
            "call_source_id": room_name,
        }

        try:
            interaction = await asyncio.to_thread(
                lambda: run_supabase_request(
                    lambda: _create_interaction_db_record(
                        self.interaction_repo,
                        interaction_data,
                    )
                )
            )
        except Exception as e:
            raise Exception(f"Failed to create interaction: {e}") from e

        interaction_id_str = str(interaction["id"])

        room_metadata = {
            "agent_db_id": str(agent.id),
            "system_prompt": agent.system_prompt,
            "interaction_type": interaction_type.value,
            "mcp_tools": agent.mcp_tools,
            "interaction_id": interaction_id_str,
        }

        from livekit import api as lk_api
        from app.livekit.client import get_livekit_api

        lk = get_livekit_api()

        async def _start_livekit() -> None:
            await room_manager.create_room(room_name, metadata=room_metadata)
            await lk.agent_dispatch.create_dispatch(
                lk_api.CreateAgentDispatchRequest(
                    room=room_name,
                    agent_name="customer-service-agent",
                    metadata=json.dumps(room_metadata),
                )
            )

        try:
            await asyncio.wait_for(
                _start_livekit(),
                timeout=LIVEKIT_START_TIMEOUT_SECONDS,
            )
        except asyncio.TimeoutError as e:
            raise Exception(
                f"Timed out starting LiveKit session after "
                f"{LIVEKIT_START_TIMEOUT_SECONDS:.0f}s — check LIVEKIT_URL and worker"
            ) from e
        except Exception as e:
            try:
                await room_manager.delete_room(room_name)
            except Exception:
                pass
            try:
                self.interaction_repo.client.table("interactions").delete().eq(
                    "id", interaction_id_str
                ).execute()
            except Exception:
                pass
            raise Exception(f"Failed to start live session: {e}") from e

        customer_identity = f"customer-{uuid4().hex[:8]}"
        customer_token = token_service.generate_customer_token(
            room_name=room_name,
            participant_identity=customer_identity,
        )

        new_status = (
            AgentStatus.IN_CALL
            if interaction_type == InteractionType.VOICE
            else AgentStatus.IN_CHAT
        )
        await asyncio.to_thread(
            lambda: run_supabase_request(
                lambda: self.agent_repo.update_status(agent.id, new_status)
            )
        )

        logger.info(
            f"Created interaction {interaction['id']} "
            f"with agent {agent.id} in room {room_name}"
        )

        return {
            "interaction_id": interaction["id"],
            "agent": agent,
            "livekit_token": customer_token,
            "livekit_url": settings.livekit_ws_url,
        }

    def list_interactions(
        self,
        supervisor_id: UUID,
        status: InteractionStatus | None = None,
        agent_id: UUID | None = None,
        page: int = 1,
        limit: int = 20,
    ):
        """List interactions for a supervisor's agents with pagination."""
        channel = agent_type_for_supervisor_id(supervisor_id)
        agents = self.agent_repo.get_by_supervisor(supervisor_id, agent_type=channel)
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

    async def end_customer_interaction(self, interaction_id: UUID) -> dict:
        """
        Customer-facing end of an active interaction (no auth).

        Used by mock-call.html when the caller hangs up so the agent is freed
        even if the LiveKit voice worker never receives participant_disconnected.
        """
        interaction = self.get_interaction(interaction_id)
        terminal = (
            InteractionStatus.COMPLETED,
            InteractionStatus.FAILED,
            InteractionStatus.ABANDONED,
        )
        if interaction.status in terminal:
            return {
                "status": "already_ended",
                "interaction_id": str(interaction_id),
            }

        await self.update_interaction(
            interaction_id=interaction_id,
            status=InteractionStatus.COMPLETED,
        )
        return {"status": "ended", "interaction_id": str(interaction_id)}

    async def update_interaction(
        self,
        interaction_id: UUID,
        status: InteractionStatus | None = None,
        phone_number: str | None = None,
    ):
        """
        Update interaction status or phone number.

        On completion/failure:
        - Update agent status back to idle (only when no other active interactions)
        - Delete LiveKit room
        """
        interaction = self.get_interaction(interaction_id)

        terminal = (
            InteractionStatus.COMPLETED,
            InteractionStatus.FAILED,
            InteractionStatus.ABANDONED,
        )
        if status in (InteractionStatus.COMPLETED, InteractionStatus.FAILED):
            if interaction.status in terminal:
                return interaction

        update_data = {}
        if phone_number is not None:
            update_data["phone_number"] = phone_number
        if status is not None:
            update_data["status"] = status.value
            if status in (InteractionStatus.COMPLETED, InteractionStatus.FAILED):
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
                other_active = (
                    self.interaction_repo.client.table("interactions")
                    .select("id")
                    .eq("agent_id", str(interaction.agent_id))
                    .eq("status", InteractionStatus.ACTIVE.value)
                    .neq("id", str(interaction_id))
                    .limit(1)
                    .execute()
                )
                if not other_active.data:
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

    async def sweep_stale_active_voice_interactions(self) -> None:
        """Close orphaned active voice interactions whose LiveKit room is gone."""
        active = (
            self.interaction_repo.client.table("interactions")
            .select("id, call_source_id, started_at")
            .eq("status", InteractionStatus.ACTIVE.value)
            .eq("interaction_type", InteractionType.VOICE.value)
            .execute()
        )
        if not active.data:
            return

        now = datetime.now(timezone.utc)
        for row in active.data:
            interaction_id = UUID(row["id"])
            room_name = row.get("call_source_id")
            started_raw = row.get("started_at")
            started_at = None
            if started_raw:
                started_at = datetime.fromisoformat(
                    str(started_raw).replace("Z", "+00:00")
                )

            room_missing = not room_name
            if room_name:
                try:
                    from livekit.protocol.room import ListRoomsRequest

                    from app.livekit.client import get_livekit_api

                    lk = get_livekit_api()
                    listed = await lk.room.list_rooms(
                        ListRoomsRequest(names=[room_name])
                    )
                    room_missing = not listed.rooms
                except Exception as e:
                    logger.warning(
                        "Voice sweep: could not list room %s: %s",
                        room_name,
                        e,
                    )

            age_seconds = (
                (now - started_at).total_seconds() if started_at else 0
            )
            if not room_missing and age_seconds < 3600:
                continue

            logger.info(
                "Sweeping stale voice interaction %s "
                "(room_missing=%s, age_seconds=%.0f)",
                interaction_id,
                room_missing,
                age_seconds,
            )
            try:
                await self.end_customer_interaction(interaction_id)
            except Exception as e:
                logger.error(
                    "Voice sweep failed for interaction %s: %s",
                    interaction_id,
                    e,
                )

    async def get_agent_ids_for_supervisor(
        self,
        supervisor_id: UUID,
        agent_type: AgentType | None = None,
    ) -> list[str]:
        """Return agent id strings for archive/analytics scoping (supervisor = auth user id)."""
        if agent_type is None:
            agent_type = agent_type_for_supervisor_id(supervisor_id)
        agents = self.agent_repo.get_by_supervisor(supervisor_id, agent_type=agent_type)
        return [str(a.id) for a in agents]

    async def get_agent_ids(self, supervisor_user_id: UUID) -> list[str]:
        """Alias for supervisors listing their own agents (same as ``get_agent_ids_for_supervisor``)."""
        return await self.get_agent_ids_for_supervisor(supervisor_user_id)
