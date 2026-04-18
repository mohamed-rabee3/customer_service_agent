"""Interaction repository for database operations."""

from uuid import UUID

from app.core.constants import InteractionStatus
from app.models.interaction import Interaction
from app.repositories.base import BaseRepository


class InteractionRepository(BaseRepository[Interaction]):
    """Repository for interaction CRUD and query operations."""

    def __init__(self):
        super().__init__(table_name="interactions", model_class=Interaction)

    def get_by_supervisor_agents(
        self,
        agent_ids: list[UUID],
        status: InteractionStatus | None = None,
        skip: int = 0,
        limit: int = 20,
    ) -> list[Interaction]:
        """Get interactions for a supervisor's agents with optional status filter."""
        try:
            query = (
                self.client.table(self.table_name)
                .select("*")
                .in_("agent_id", [str(aid) for aid in agent_ids])
            )
            if status:
                query = query.eq("status", status.value)
            query = query.order("started_at", desc=True).range(skip, skip + limit - 1)
            response = query.execute()
            return [self.model_class.model_validate(item) for item in response.data]
        except Exception as e:
            raise Exception(f"Failed to fetch interactions: {e}") from e

    def count_by_filter(
        self,
        agent_ids: list[UUID],
        status: InteractionStatus | None = None,
    ) -> int:
        """Count interactions matching filter (for pagination)."""
        try:
            query = (
                self.client.table(self.table_name)
                .select("id", count="exact")
                .in_("agent_id", [str(aid) for aid in agent_ids])
            )
            if status:
                query = query.eq("status", status.value)
            response = query.execute()
            return response.count or 0
        except Exception as e:
            raise Exception(f"Failed to count interactions: {e}") from e

    def get_active_by_agent(self, agent_id: UUID) -> Interaction | None:
        """Get the current active interaction for an agent."""
        try:
            response = (
                self.client.table(self.table_name)
                .select("*")
                .eq("agent_id", str(agent_id))
                .eq("status", InteractionStatus.ACTIVE.value)
                .limit(1)
                .execute()
            )
            if not response.data:
                return None
            return self.model_class.model_validate(response.data[0])
        except Exception as e:
            raise Exception(f"Failed to fetch active interaction for agent {agent_id}: {e}") from e

    def get_by_agent(
        self,
        agent_id: UUID,
        status: InteractionStatus | None = None,
        skip: int = 0,
        limit: int = 20,
    ) -> list[Interaction]:
        """Get interactions for a specific agent."""
        try:
            query = (
                self.client.table(self.table_name)
                .select("*")
                .eq("agent_id", str(agent_id))
            )
            if status:
                query = query.eq("status", status.value)
            query = query.order("started_at", desc=True).range(skip, skip + limit - 1)
            response = query.execute()
            return [self.model_class.model_validate(item) for item in response.data]
        except Exception as e:
            raise Exception(f"Failed to fetch interactions for agent {agent_id}: {e}") from e
