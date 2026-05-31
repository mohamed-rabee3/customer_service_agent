"""Agent schemas."""

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.core.constants import AgentStatus, AgentType


class CreateAgentRequest(BaseModel):
    """Request schema for creating a new agent."""

    model_config = ConfigDict(extra="ignore")

    name: str = Field(..., min_length=1, max_length=255, description="Agent name")
    system_prompt: str = Field(..., min_length=1, description="System instructions for the agent")
    telegram_bot_token: str | None = Field(None, description="(Deprecated) Telegram Bot Token - use webhook_configs instead")
    webhook_configs: dict[str, Any] = Field(default_factory=dict, description="Multi-channel webhook configurations (telegram, whatsapp, instagram)")
    mcp_tools: dict[str, Any] = Field(default_factory=dict, description="MCP tools JSON configuration")
    agent_type: str | None = Field(None, description="Agent Type ('voice' or 'chat')")

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

    model_config = ConfigDict(extra="ignore")

    name: str | None = Field(None, min_length=1, max_length=255, description="Agent name")
    system_prompt: str | None = Field(None, min_length=1, description="System instructions for the agent")
    telegram_bot_token: str | None = Field(None, description="(Deprecated) Telegram Bot Token - use webhook_configs instead")
    webhook_configs: dict[str, Any] | None = Field(None, description="Multi-channel webhook configurations (telegram, whatsapp, instagram)")
    mcp_tools: dict[str, Any] | None = Field(None, description="MCP tools JSON configuration")
    status: AgentStatus | None = Field(None, description="Current agent status")

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
    telegram_bot_token: str | None = None
    webhook_configs: dict[str, Any] = Field(default_factory=dict)
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
    webhook_configs: dict[str, Any] = Field(default_factory=dict)
    telegram_bot_token: str | None = None
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
    telegram_bot_token: str | None = None
    mcp_tools: dict[str, Any]
    created_at: datetime
    updated_at: datetime
    current_interaction: dict[str, Any] | None = None
    analytics: dict[str, Any] | None = None


class AgentWhisperRequest(BaseModel):
    """Supervisor instruction injected during an active voice/chat call."""

    instructions: str = Field(
        ..., min_length=1, max_length=2000,
        description="Instruction for the agent to follow",
    )


class AgentWhisperResponse(BaseModel):
    """Response after sending a whisper to an agent via LiveKit."""

    whisper_id: str
    agent_id: str
    agent_status: str
    paused_at: str
    instructions_sent: bool
    acknowledged: bool
    acknowledged_at: str
    resumed_at: str | None = None
