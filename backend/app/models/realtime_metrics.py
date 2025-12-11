"""Real-time metrics model."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.core.constants import Sentiment


class RealtimeMetrics(BaseModel):
    """Real-time metrics model representing realtime_metrics table."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    interaction_id: UUID  # FK references interactions.id
    sentiment: Sentiment
    satisfaction_score: float  # 0-100
    feed_text: str  # Short AI-generated sentence
    timestamp: datetime

