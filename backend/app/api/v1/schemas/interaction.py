"""Interaction API request/response schemas."""

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.api.v1.schemas.agent import AgentResponse
from app.core.constants import InteractionType


# ========== Request Schemas ==========


class CreateInteractionRequest(BaseModel):
    """Request schema for starting a new interaction."""

    interaction_type: InteractionType
    phone_number: str | None = Field(
        None,
        description="Mock phone number from PWA",
        examples=["+1234567890"],
    )


class UpdateInteractionRequest(BaseModel):
    """Request schema for updating an interaction."""

    status: str | None = Field(
        None,
        description="New status: completed or failed",
        pattern="^(completed|failed)$",
    )
    phone_number: str | None = Field(
        None,
        description="Customer phone number collected by agent",
    )


# ========== Response Schemas ==========


class InteractionResponse(BaseModel):
    """Response schema for interaction."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    agent_id: UUID
    agent_name: str | None = None
    phone_number: str | None = None
    interaction_type: str
    status: str
    started_at: datetime
    ended_at: datetime | None = Field(None, alias="end_at")
    duration_seconds: int | None = None

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class InteractionDetailResponse(InteractionResponse):
    """Detailed interaction response with metrics and permissions."""

    livekit_room_id: str | None = Field(None, alias="call_source_id")
    realtime_metrics: list[dict[str, Any]] = Field(default_factory=list)
    tool_permissions: list[dict[str, Any]] = Field(default_factory=list)


class CreateInteractionResponse(BaseModel):
    """Response after creating a new interaction."""

    interaction_id: str
    agent: AgentResponse
    livekit_token: str
    livekit_url: str


class InteractionListResponse(BaseModel):
    """Paginated list of interactions."""

    interactions: list[InteractionResponse]
    total: int
    page: int
    limit: int
