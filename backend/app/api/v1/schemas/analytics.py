"""Analytics schemas."""

from pydantic import BaseModel
from typing import Optional


class AgentInfo(BaseModel):
    agent_type: Optional[str] = None


class AdminAnalyticsOut(BaseModel):
    csat_score: float
    resolution_time_sec: int
    fcr_status: bool
    agents: Optional[AgentInfo] = None
