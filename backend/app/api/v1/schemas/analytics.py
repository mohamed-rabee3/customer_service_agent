"""Analytics schemas."""
from typing import List, Optional
from pydantic import BaseModel
from uuid import UUID

class AgentAnalytics(BaseModel):
    agent_id: str
    agent_name: str
    total_interactions: int
    avg_handle_time: float
    fcr_percentage: float
    avg_csat: float
    performance_score: float

class SupervisorAnalytics(BaseModel):
    performance_score: float
    fcr_percentage: float
    avg_csat: float
    avg_handle_time: float
    total_interactions: int
    agents_breakdown: List[AgentAnalytics]
