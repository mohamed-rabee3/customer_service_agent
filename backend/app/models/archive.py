"""Archive model for completed interactions."""

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.core.constants import InteractionType


class Archive(BaseModel):
    """Archive model representing completed interactions."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    agent_id: UUID  # FK references agents.id
    phone_number: str | None = None
    interaction_type: InteractionType
    status: str  # "completed" or "failed"
    started_at: datetime
    end_at: datetime | None = None
    summary: str | None = None
    issues: dict[str, Any] | None = None  # JSON field
    tags: dict[str, Any] | None = None  # JSON field
    call_source_ID: str | None = None  # chat: chatID, voice: livekit_room_id
    csat_score: float | None = None
    resolution_time_sec: int | None = None
    fcr_status: bool | None = None  # First Contact Resolution status

