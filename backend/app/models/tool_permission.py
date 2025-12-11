"""Tool permission model."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.core.constants import ToolPermissionStatus


class ToolPermission(BaseModel):
    """Tool permission model representing tool_permissions table."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    interaction_id: UUID  # FK references interactions.id
    tool_name: str
    supervisor_response: str | None = None  # "allowed" or "denied"
    responded_at: datetime | None = None
    status: ToolPermissionStatus

