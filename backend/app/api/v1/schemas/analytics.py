from pydantic import BaseModel
from typing import List, Optional

class AgentBreakdown(BaseModel):
    agent_id: str
    agent_name: str
    total_interactions: int
    avg_csat: float
    performance_score: float

class SupervisorAnalytics(BaseModel):
    performance_score: float
    fcr_percentage: float
    avg_csat: float
    avg_handle_time: float
    total_interactions: int
    agents_breakdown: List[AgentBreakdown] = []

class AgentAnalytics(BaseModel):
    agent_id: str
    agent_name: str
    total_interactions: int
    fcr_percentage: float
    avg_csat: float
    avg_handle_time: float
    performance_score: float