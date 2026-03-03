"""Interaction schemas."""
from datetime import datetime
from typing import List, Optional, Any, Dict
from uuid import UUID
from pydantic import BaseModel, ConfigDict

class Interaction(BaseModel):
    """Schema for interaction list view."""
    id: UUID
    agent_id: str
    agent_name: str
    type: str  # 'voice' or 'chat'
    status: str
    started_at: datetime
    ended_at: Optional[datetime] = None
    duration_seconds: Optional[int] = None
    livekit_room_id: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)

class InteractionDetail(Interaction):
    """Schema for interaction detailed view with joined data."""
    transcript: Optional[str] = None
    recording_url: Optional[str] = None
    # Joined data
    realtime_metrics: List[Dict[str, Any]] = []
    tool_permissions: List[Dict[str, Any]] = []