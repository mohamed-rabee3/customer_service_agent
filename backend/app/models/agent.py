"""Agent model."""

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.core.constants import AgentStatus, AgentType


class Agent(BaseModel):
    """Agent model representing agents table."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    supervisor_id: UUID  # FK references supervisors.userID
    name: str
    agent_type: AgentType
    system_prompt: str
    status: AgentStatus
    mcp_tools: dict[str, Any]  # JSON field
    created_at: datetime
    updated_at: datetime

