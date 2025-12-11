"""Supervisor model."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.core.constants import SupervisorType


class Supervisor(BaseModel):
    """Supervisor model representing supervisors table."""

    model_config = ConfigDict(from_attributes=True)

    userID: UUID  # PK/FK references users.uid
    supervisor_type: SupervisorType
    performance_score: float | None = None
    total_interactions: int = 0
    created_at: datetime
    updated_at: datetime

