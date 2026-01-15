"""Agent schemas."""

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.core.constants import AgentStatus, AgentType


class CreateAgentRequest(BaseModel):
    """Request schema for creating a new agent."""

    model_config = ConfigDict(strict=True)

    name: str = Field(..., min_length=1, max_length=255, description="Agent name")
    system_prompt: str = Field(..., min_length=1, description="System instructions for the agent")
    mcp_tools: dict[str, Any] = Field(default_factory=dict, description="MCP tools JSON configuration")

    @field_validator("mcp_tools", mode="before")
    @classmethod
    def validate_mcp_tools(cls, v: Any) -> dict[str, Any]:
        """Validate that mcp_tools is a valid dict/JSON object."""
        if v is None:
            return {}
        if not isinstance(v, dict):
            raise ValueError("mcp_tools must be a valid JSON object")
        return v


class UpdateAgentRequest(BaseModel):
    """Request schema for updating an agent (partial update)."""

    model_config = ConfigDict(strict=True)

    name: str | None = Field(None, min_length=1, max_length=255, description="Agent name")
    system_prompt: str | None = Field(None, min_length=1, description="System instructions for the agent")
    mcp_tools: dict[str, Any] | None = Field(None, description="MCP tools JSON configuration")

    @field_validator("mcp_tools", mode="before")
    @classmethod
    def validate_mcp_tools(cls, v: Any) -> dict[str, Any] | None:
        """Validate that mcp_tools is a valid dict/JSON object."""
        if v is None:
            return None
        if not isinstance(v, dict):
            raise ValueError("mcp_tools must be a valid JSON object")
        return v


class AgentResponse(BaseModel):
    """Response schema for agent data."""

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


class AgentCreateResponse(BaseModel):
    """Response schema after creating an agent."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    supervisor_id: UUID
    name: str
    agent_type: AgentType
    status: AgentStatus
    mcp_tools: dict[str, Any]
    created_at: datetime
    updated_at: datetime


class AgentStatusResponse(BaseModel):
    """Response schema for agent status endpoint."""

    model_config = ConfigDict(from_attributes=True)

    agent_id: UUID
    status: AgentStatus
    current_interaction: dict[str, Any] | None = None
    realtime_metrics: dict[str, Any] | None = None


class AgentDetailResponse(BaseModel):
    """Response schema for detailed agent information."""

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
    current_interaction: dict[str, Any] | None = None
    analytics: dict[str, Any] | None = None
