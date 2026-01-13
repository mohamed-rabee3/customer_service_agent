"""Admin schemas."""
from datetime import datetime
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict
from app.core.constants import SupervisorType

class SupervisorCard(BaseModel):
    """Schema for list of active supervisors."""
    id: UUID
    name: str
    email: Optional[str] = None
    supervisor_type: SupervisorType
    created_at: datetime
    is_active: bool = True
    active_agents_count: int = 0
    
    model_config = ConfigDict(from_attributes=True)

class LeaderboardEntry(BaseModel):
    """Schema for supervisor leaderboard."""
    id: UUID
    name: str
    performance_score: float
    rank: int

class AdminDashboardResponse(BaseModel):
    """Main response model for admin dashboard."""
    total_active_supervisors: int
    active_supervisors: List[SupervisorCard]
    leaderboard: List[LeaderboardEntry]
