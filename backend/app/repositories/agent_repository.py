"""Agent repository - Data access layer for agents table."""

from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.core.constants import AgentStatus, AgentType
from app.db.base import BaseRepository
from app.db.supabase import get_supabase_client


class AgentModel(BaseModel):
    """Pydantic model representing an agent record."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    supervisor_id: UUID
    name: str
    agent_type: AgentType
    system_prompt: str
    status: AgentStatus
    mcp_tools: dict[str, Any]
    created_at: datetime
    updated_at: datetime


class AgentRepository(BaseRepository[AgentModel]):
    """Repository for agent CRUD operations using Supabase."""

    def __init__(self):
        """Initialize repository with specific table and model."""
        super().__init__(table_name="agents", model_class=AgentModel)

    def count_by_supervisor(self, supervisor_id: UUID) -> int:
        """
        Count the number of agents owned by a supervisor.
        """
        result = (
            self.client.table(self.table_name)
            .select("id", count="exact")
            .eq("supervisor_id", str(supervisor_id))
            .execute()
        )

        return result.count if result.count is not None else 0

    def get_by_supervisor(self, supervisor_id: UUID) -> list[AgentModel]:
        """
        Get all agents for a supervisor.
        """
        result = (
            self.client.table(self.table_name)
            .select("*")
            .eq("supervisor_id", str(supervisor_id))
            .order("created_at", desc=False)
            .execute()
        )

        return [self.model_class.model_validate(agent) for agent in result.data]

    def create_agent(
        self,
        supervisor_id: UUID,
        name: str,
        system_prompt: str,
        mcp_tools: dict[str, Any],
        agent_type: AgentType = AgentType.VOICE,
    ) -> AgentModel:
        """
        Create a new agent.
        Use custom create method because of specific fields not easier to map from Schema directly in service.
        """
        now = datetime.now(timezone.utc).isoformat()

        # We construct the model data manually here as per previous logic
        # Ideally we could construct AgentModel in service and call super().create(model),
        # but creating a Pydantic model with auto-generated fields (id, dates) is tricky without db default return.
        # So we keep this custom method but could use super().create if we passed a full dict.
        # Sticking to custom dict insert for precision.
        
        agent_data = {
            "supervisor_id": str(supervisor_id),
            "name": name,
            "agent_type": agent_type.value,
            "system_prompt": system_prompt,
            "status": AgentStatus.IDLE.value,
            "mcp_tools": mcp_tools,
            "created_at": now,
            "updated_at": now,
        }

        result = (
            self.client.table(self.table_name)
            .insert(agent_data)
            .execute()
        )

        if not result.data:
             raise Exception("Failed to create agent")

        return self.model_class.model_validate(result.data[0])

    def get_current_interaction(self, agent_id: UUID) -> dict[str, Any] | None:
        """
        Get the current active interaction for an agent.
        """
        result = (
            self.client.table("interactions")
            .select("*")
            .eq("agent_id", str(agent_id))
            .eq("status", "active")
            .order("started_at", desc=True)
            .limit(1)
            .execute()
        )

        if result.data and len(result.data) > 0:
            return result.data[0]

        return None

    def get_latest_metrics(self, interaction_id: UUID) -> dict[str, Any] | None:
        """
        Get the latest realtime metrics for an interaction.
        """
        result = (
            self.client.table("realtime_metrics")
            .select("*")
            .eq("interaction_id", str(interaction_id))
            .order("timestamp", desc=True)
            .limit(1)
            .execute()
        )

        if result.data and len(result.data) > 0:
            return result.data[0]

        return None

    def get_agent_analytics(self, agent_id: UUID) -> dict[str, Any] | None:
        """
        Get analytics data for an agent.
        """
        result = (
            self.client.table("agent_analytics")
            .select("*")
            .eq("agent_id", str(agent_id))
            .limit(1)
            .execute()
        )

        if result.data and len(result.data) > 0:
            return result.data[0]

        return None


# Singleton instance
agent_repository = AgentRepository()
