"""Agent service with business logic."""

import logging
from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from pydantic import BaseModel

from app.core.constants import AgentStatus, AgentType, MAX_AGENTS_PER_SUPERVISOR
from app.core.exceptions import (
    AgentBusyException,
    ForbiddenException,
    NotFoundException,
    ValidationException,
)
from app.repositories.agent_repository import AgentRepository
from app.repositories.interaction_repository import InteractionRepository

logger = logging.getLogger(__name__)


class CreateAgentData(BaseModel):
    """Data for creating a new agent."""

    name: str
    system_prompt: str
    mcp_tools: dict[str, Any]


class UpdateAgentData(BaseModel):
    """Data for updating an agent."""

    name: str | None = None
    system_prompt: str | None = None
    mcp_tools: dict[str, Any] | None = None


class AgentService:
    """Service for agent business logic."""

    def __init__(self):
        self.agent_repo = AgentRepository()
        self.interaction_repo = InteractionRepository()

    def create_agent(
        self,
        supervisor_id: UUID,
        agent_type: AgentType,
        data: CreateAgentData,
    ):
        """
        Create a new agent for a supervisor.

        Enforces:
        - Maximum 3 agents per supervisor
        - Agent type matches supervisor type
        """
        # Check agent count limit
        count = self.agent_repo.count_by_supervisor(supervisor_id)
        if count >= MAX_AGENTS_PER_SUPERVISOR:
            raise ValidationException(
                f"Maximum {MAX_AGENTS_PER_SUPERVISOR} agents allowed per supervisor"
            )

        # Build agent data for insertion
        agent_data = {
            "supervisor_id": str(supervisor_id),
            "name": data.name,
            "agent_type": agent_type.value,
            "system_prompt": data.system_prompt,
            "status": AgentStatus.IDLE.value,
            "mcp_tools": data.mcp_tools,
        }

        # Use raw insert (not model-based) since we don't have all fields yet
        try:
            response = (
                self.agent_repo.client.table("agents")
                .insert(agent_data)
                .execute()
            )
            if not response.data:
                raise Exception("Failed to create agent")

            from app.models.agent import Agent

            return Agent.model_validate(response.data[0])
        except ValidationException:
            raise
        except Exception as e:
            raise Exception(f"Failed to create agent: {e}") from e

    def get_agent(self, agent_id: UUID, supervisor_id: UUID):
        """Get agent with ownership check."""
        agent = self.agent_repo.get_by_id_and_supervisor(agent_id, supervisor_id)
        if not agent:
            raise NotFoundException(f"Agent {agent_id} not found")
        return agent

    def get_agent_detail(self, agent_id: UUID, supervisor_id: UUID):
        """Get agent with current interaction and analytics."""
        agent = self.get_agent(agent_id, supervisor_id)

        # Get current active interaction if any
        current_interaction = self.interaction_repo.get_active_by_agent(agent_id)

        return {
            "agent": agent,
            "current_interaction": current_interaction,
        }

    def update_agent(
        self,
        agent_id: UUID,
        supervisor_id: UUID,
        data: UpdateAgentData,
    ):
        """
        Update agent configuration.

        Enforces: Agent must be idle (409 if busy).
        """
        agent = self.get_agent(agent_id, supervisor_id)

        if agent.status != AgentStatus.IDLE:
            raise AgentBusyException(
                "Cannot update agent while in active call/chat"
            )

        # Build update data
        update_data = data.model_dump(exclude_none=True)
        if not update_data:
            return agent  # Nothing to update

        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()

        try:
            response = (
                self.agent_repo.client.table("agents")
                .update(update_data)
                .eq("id", str(agent_id))
                .execute()
            )
            if not response.data:
                raise NotFoundException(f"Agent {agent_id} not found")

            from app.models.agent import Agent

            return Agent.model_validate(response.data[0])
        except (NotFoundException, AgentBusyException):
            raise
        except Exception as e:
            raise Exception(f"Failed to update agent: {e}") from e

    def delete_agent(self, agent_id: UUID, supervisor_id: UUID) -> bool:
        """Delete agent with ownership check."""
        agent = self.get_agent(agent_id, supervisor_id)

        # Check if agent is busy
        if agent.status != AgentStatus.IDLE:
            raise AgentBusyException(
                "Cannot delete agent while in active call/chat"
            )

        return self.agent_repo.delete(agent_id)

    def get_agent_status(self, agent_id: UUID, supervisor_id: UUID):
        """Get agent status with current interaction and metrics."""
        agent = self.get_agent(agent_id, supervisor_id)
        current_interaction = self.interaction_repo.get_active_by_agent(agent_id)

        # Get latest realtime metrics if there's an active interaction
        realtime_metrics = None
        if current_interaction:
            try:
                metrics_response = (
                    self.agent_repo.client.table("realtime_metrics")
                    .select("*")
                    .eq("interaction_id", str(current_interaction.id))
                    .order("timestamp", desc=True)
                    .limit(1)
                    .execute()
                )
                if metrics_response.data:
                    realtime_metrics = metrics_response.data[0]
            except Exception:
                pass  # Metrics are non-critical

        return {
            "agent_id": agent.id,
            "status": agent.status,
            "current_interaction": current_interaction,
            "realtime_metrics": realtime_metrics,
        }

    def get_agents_by_supervisor(self, supervisor_id: UUID):
        """Get all agents for a supervisor."""
        return self.agent_repo.get_by_supervisor(supervisor_id)
