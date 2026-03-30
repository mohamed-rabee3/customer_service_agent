"""Tool permission API request/response schemas."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


# ========== Request Schemas ==========


class PermissionRespondRequest(BaseModel):
    """Request schema for responding to a tool permission."""

    response: str = Field(
        ...,
        description="Supervisor response to permission request",
        pattern="^(allowed|denied)$",
    )


# ========== Response Schemas ==========


class PermissionRespondResponse(BaseModel):
    """Response after responding to a permission request."""

    permission_id: UUID
    response: str
    responded_at: datetime


class ToolPermissionItem(BaseModel):
    """Tool permission record."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    interaction_id: UUID
    tool_name: str
    tool_description: str | None = None
    requested_at: datetime | None = None
    status: str
    supervisor_response: str | None = None
    responded_at: datetime | None = None
