"""Agent API request/response schemas."""

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


# ========== Request Schemas ==========


class CreateAgentRequest(BaseModel):
    """Request schema for creating an agent."""

    name: str = Field(..., min_length=1, max_length=255, examples=["Voice Agent 1"])
    system_prompt: str = Field(
        ...,
        min_length=1,
        examples=["You are a helpful customer service agent..."],
    )
    mcp_tools: dict[str, Any] = Field(
        ...,
        description="MCP tools JSON configuration",
        examples=[{
            "tools": [
                {
                    "name": "get_customer_details",
                    "requires_permission": True,
                    "config": {"endpoint": "https://api.example.com/customers"},
                }
            ]
        }],
    )


class UpdateAgentRequest(BaseModel):
    """Request schema for updating an agent."""

    name: str | None = Field(None, min_length=1, max_length=255)
    system_prompt: str | None = None
    mcp_tools: dict[str, Any] | None = None


class WhisperRequest(BaseModel):
    """Request schema for sending whisper instructions."""

    instructions: str = Field(
        ...,
        min_length=1,
        max_length=500,
        description="Instructions to send to agent",
        examples=["Don't mention pricing. Focus on features."],
    )


# ========== Response Schemas ==========


class AgentResponse(BaseModel):
    """Response schema for agent."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    agent_type: str
    status: str
    performance_score: float | None = None
    total_interactions: int = 0
    tools: list[str] = Field(default_factory=list)
    created_at: datetime


class AgentDetailResponse(AgentResponse):
    """Detailed agent response with config and current state."""

    system_prompt: str
    mcp_tools: dict[str, Any]
    current_interaction: dict | None = None
    analytics: dict | None = None


class AgentStatusResponse(BaseModel):
    """Agent status response."""

    agent_id: UUID
    status: str
    current_interaction: dict | None = None
    realtime_metrics: dict | None = None


class WhisperResponse(BaseModel):
    """Response after sending whisper instructions."""

    whisper_id: str
    agent_id: str
    agent_status: str
    paused_at: str
    instructions_sent: bool
    acknowledged: bool
    acknowledged_at: str | None = None
    resumed_at: str | None = None
