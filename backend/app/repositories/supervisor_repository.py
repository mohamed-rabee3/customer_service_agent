"""Supervisor repository - Data access layer for supervisors table."""

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.core.constants import SupervisorType
from app.db.base import BaseRepository
from app.db.supabase import get_supabase_client


class SupervisorModel(BaseModel):
    """Pydantic model representing a supervisor record."""

    model_config = ConfigDict(from_attributes=True)

    userID: UUID
    name: str | None = None
    supervisor_type: SupervisorType
    performance_score: float | None = None
    total_interactions: int = 0
    created_at: datetime
    updated_at: datetime

    @property
    def id(self) -> UUID:
        """Alias for userID to match API conventions."""
        return self.userID


class SupervisorRepository(BaseRepository[SupervisorModel]):
    """Repository for supervisor operations using Supabase."""

    def __init__(self):
        """Initialize repository."""
        super().__init__(table_name="supervisors", model_class=SupervisorModel)

    def get_all_supervisors(
        self,
        skip: int = 0,
        limit: int = 20,
        supervisor_type: SupervisorType | None = None,
    ) -> tuple[list[SupervisorModel], int]:
        """
        Get all supervisors with pagination.
        Custom implementation because BaseRepository.get_all doesn't return total count 
        or filter by type specific to supervisors.
        """
        query = self.client.table(self.table_name).select("*", count="exact")

        if supervisor_type:
            query = query.eq("supervisor_type", supervisor_type.value)

        result = (
            query.range(skip, skip + limit - 1)
            .order("created_at", desc=True)
            .execute()
        )

        supervisors = [self.model_class.model_validate(s) for s in result.data]
        total = result.count if result.count is not None else 0

        return supervisors, total

    def get_by_id(self, id: UUID) -> SupervisorModel | None:
        """
        Get by ID override because column name is 'userID', not 'id'.
        BaseRepository assumes 'id'.
        """
        try:
            response = (
                self.client.table(self.table_name)
                .select("*")
                .eq("userID", str(id))
                .execute()
            )

            if not response.data:
                return None

            return self.model_class.model_validate(response.data[0])

        except Exception as e:
            raise Exception(f"Failed to fetch supervisor {id}: {str(e)}") from e

    def get_dashboard_data(self, supervisor_id: UUID) -> list[dict[str, Any]]:
        """
        Get aggregated dashboard data for a supervisor.
        """
        # 1. Fetch all agents for this supervisor
        agents_result = (
            self.client.table("agents")
            .select("*")
            .eq("supervisor_id", str(supervisor_id))
            .order("created_at")
            .execute()
        )
        agents = agents_result.data
        if not agents:
            return []

        # 2. Identify active agents
        active_agent_ids = [
            a["id"] for a in agents 
            if a.get("status") in ["in_call", "in_chat"]
        ]

        interaction_map = {}
        if active_agent_ids:
            # 3. Batch fetch active interactions
            interactions_result = (
                self.client.table("interactions")
                .select("*")
                .in_("agent_id", active_agent_ids)
                .eq("status", "active")
                .execute()
            )
            interactions = interactions_result.data
            interaction_map = {i["agent_id"]: i for i in interactions}
        
        # Enrich agents
        enriched_agents = []
        for agent in agents:
            agent_data = agent.copy()
            current_int = interaction_map.get(agent["id"])
            
            latest_metrics = None
            if current_int:
                metrics_res = (
                    self.client.table("realtime_metrics")
                    .select("*")
                    .eq("interaction_id", current_int["id"])
                    .order("timestamp", desc=True)
                    .limit(1)
                    .execute()
                )
                if metrics_res.data:
                    latest_metrics = metrics_res.data[0]
            
            agent_data["current_interaction"] = current_int
            agent_data["latest_metrics"] = latest_metrics
            enriched_agents.append(agent_data)
            
        return enriched_agents

    def get_agents_by_supervisor(self, supervisor_id: UUID) -> list[dict[str, Any]]:
        """Get all agents for a supervisor."""
        return self.get_dashboard_data(supervisor_id)

    def get_recent_interactions(
        self,
        supervisor_id: UUID,
        limit: int = 10,
    ) -> list[dict[str, Any]]:
        """Get recent interactions for a supervisor's agents."""
        agents_result = (
            self.client.table("agents")
            .select("id")
            .eq("supervisor_id", str(supervisor_id))
            .execute()
        )

        if not agents_result.data:
            return []

        agent_ids = [str(a["id"]) for a in agents_result.data]

        result = (
            self.client.table("interactions")
            .select("*")
            .in_("agent_id", agent_ids)
            .order("started_at", desc=True)
            .limit(limit)
            .execute()
        )

        return result.data


# Singleton instance
supervisor_repository = SupervisorRepository()
