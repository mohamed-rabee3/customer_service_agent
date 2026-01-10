from pydantic import BaseModel
from typing import List, Optional

class SupervisorCard(BaseModel):
    id: str
    full_name: str
    status: str
    last_active: Optional[str] = None
    performance_score: float

class LeaderboardEntry(BaseModel):
    full_name: str
    performance_score: float
    rank: int

class AdminDashboardResponse(BaseModel):
    total_active_supervisors: int
    active_supervisors: List[SupervisorCard]
    leaderboard: List[LeaderboardEntry]