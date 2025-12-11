"""Interaction model for active calls/chats."""

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.core.constants import InteractionStatus, InteractionType


class Interaction(BaseModel):
    """Interaction model representing interactions table."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    agent_id: UUID  # FK references agents.id
    phone_number: str | None = None
    interaction_type: InteractionType
    status: InteractionStatus
    started_at: datetime
    end_at: datetime | None = None
    summary: str | None = None
    issues: dict[str, Any] | None = None  # JSON field
    tags: dict[str, Any] | None = None  # JSON field
    call_source_ID: str | None = None  # chat: chatID, voice: livekit_room_id

