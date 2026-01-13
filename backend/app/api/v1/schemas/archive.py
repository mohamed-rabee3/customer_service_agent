"""Archive schemas."""
from datetime import datetime
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict

class ArchiveCard(BaseModel):
    """Schema for list view of archives."""
    id: UUID
    interaction_id: UUID
    agent_id: str
    agent_name: str
    phone_number: str
    type: str  # 'voice' or 'chat'
    status: str
    started_at: datetime
    duration_seconds: Optional[int] = None
    summary: Optional[str] = None
    tags: List[str] = []
    csat_score: Optional[float] = None
    
    model_config = ConfigDict(from_attributes=True)

class ArchiveDetail(ArchiveCard):
    """Schema for detailed view of an archive."""
    transcript: Optional[str] = None
    recording_url: Optional[str] = None
    issues: List[str] = []
    resolution_time_seconds: Optional[int] = None
    fcr_status: bool = False
    sentiment_score: Optional[float] = None
