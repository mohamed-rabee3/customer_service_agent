"""Agent repository for database operations."""

from uuid import UUID

from app.core.constants import AgentStatus, AgentType
from app.models.agent import Agent
from app.repositories.base import BaseRepository


class AgentRepository(BaseRepository[Agent]):
    """Repository for agent CRUD and query operations."""

    def __init__(self):
        super().__init__(table_name="agents", model_class=Agent)

    def get_by_supervisor(self, supervisor_id: UUID) -> list[Agent]:
        """Get all agents for a supervisor."""
        try:
            response = (
                self.client.table(self.table_name)
                .select("*")
                .eq("supervisor_id", str(supervisor_id))
                .order("created_at", desc=False)
                .execute()
            )
            return [self.model_class.model_validate(item) for item in response.data]
        except Exception as e:
            raise Exception(f"Failed to fetch agents for supervisor {supervisor_id}: {e}") from e

    def count_by_supervisor(self, supervisor_id: UUID) -> int:
        """Count agents for a supervisor (for limit enforcement)."""
        try:
            response = (
                self.client.table(self.table_name)
                .select("id", count="exact")
                .eq("supervisor_id", str(supervisor_id))
                .execute()
            )
            return response.count or 0
        except Exception as e:
            raise Exception(f"Failed to count agents for supervisor {supervisor_id}: {e}") from e

    def get_by_id_and_supervisor(self, agent_id: UUID, supervisor_id: UUID) -> Agent | None:
        """Get agent by ID with ownership validation."""
        try:
            response = (
                self.client.table(self.table_name)
                .select("*")
                .eq("id", str(agent_id))
                .eq("supervisor_id", str(supervisor_id))
                .execute()
            )
            if not response.data:
                return None
            return self.model_class.model_validate(response.data[0])
        except Exception as e:
            raise Exception(f"Failed to fetch agent {agent_id}: {e}") from e

    def find_idle_agent_for_supervisors(
        self, agent_type: AgentType, supervisor_ids: list[UUID]
    ) -> Agent | None:
        """Find an idle agent of the given type owned by one of the supervisors."""
        if not supervisor_ids:
            return None
        try:
            id_strings = [str(sid) for sid in supervisor_ids]
            response = (
                self.client.table(self.table_name)
                .select("*")
                .eq("agent_type", agent_type.value)
                .eq("status", AgentStatus.IDLE.value)
                .in_("supervisor_id", id_strings)
                .limit(1)
                .execute()
            )
            if not response.data:
                return None
            return self.model_class.model_validate(response.data[0])
        except Exception as e:
            raise Exception(f"Failed to find idle agent: {e}") from e

    def update_status(self, agent_id: UUID, status: AgentStatus) -> Agent:
        """Update agent status atomically."""
        try:
            response = (
                self.client.table(self.table_name)
                .update({"status": status.value})
                .eq("id", str(agent_id))
                .execute()
            )
            if not response.data:
                raise Exception(f"Agent {agent_id} not found")
            return self.model_class.model_validate(response.data[0])
        except Exception as e:
            raise Exception(f"Failed to update agent status: {e}") from e
