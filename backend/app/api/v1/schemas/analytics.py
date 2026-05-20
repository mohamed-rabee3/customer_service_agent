"""Analytics schemas."""
from typing import List, Optional
from pydantic import BaseModel
from uuid import UUID


class AgentAnalytics(BaseModel):
    agent_id: str
    agent_name: str
    agent_type: str = "voice"
    total_interactions: int
    avg_handle_time: float
    fcr_percentage: float
    avg_csat: float
    performance_score: float
    # ── New KPIs ──
    sentiment_shift: float = 0.0            # -1.0 to +1.0 average shift
    containment_rate: float = 0.0           # % of interactions handled without escalation
    avg_response_time: float = 0.0          # seconds — chat only, 0 for voice
    chat_resolution_rate: float = 0.0       # % — chat only, 0 for voice
    escalation_count: int = 0               # total escalations (tool_permissions)
    coaching_count: int = 0                 # whisper interventions received


class SupervisorAnalytics(BaseModel):
    performance_score: float
    fcr_percentage: float
    avg_csat: float
    avg_handle_time: float
    total_interactions: int
    agents_breakdown: List[AgentAnalytics]
    # ── New KPIs ──
    avg_sentiment_shift: float = 0.0
    containment_rate: float = 0.0
    avg_escalation_resolution_time: float = 0.0   # seconds
    coaching_frequency: float = 0.0                # sessions per agent
    chat_avg_response_time: float = 0.0            # seconds
    chat_resolution_rate: float = 0.0              # %
    total_voice_interactions: int = 0
    total_chat_interactions: int = 0


class SupervisorSummary(BaseModel):
    """Lightweight supervisor info for admin overview."""
    supervisor_id: str
    performance_score: float
    total_interactions: int
    avg_csat: float
    fcr_percentage: float
    containment_rate: float = 0.0


class AdminAnalytics(BaseModel):
    """Aggregate analytics across ALL supervisors for admin dashboard."""
    overall_csat: float
    total_interactions: int
    total_voice_interactions: int
    total_chat_interactions: int
    avg_handle_time: float
    avg_fcr: float
    containment_rate: float
    avg_sentiment_shift: float
    avg_escalation_resolution_time: float = 0.0
    coaching_frequency: float = 0.0
    chat_avg_response_time: float = 0.0
    chat_resolution_rate: float = 0.0
    performance_score: float = 0.0
    supervisors_breakdown: List[SupervisorSummary] = []
