"""Agent tool configuration model."""

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class AgentTool(BaseModel):
    """Agent tool configuration model representing agent_tools table."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    agent_id: UUID  # FK references agents.id
    tool_name: str
    tool_config: dict[str, Any]  # JSON field
    requires_permission: bool
    created_at: datetime

