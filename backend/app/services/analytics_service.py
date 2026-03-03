from typing import List, Dict, Any, Optional
from uuid import UUID
from app.db.supabase import get_supabase_client
from app.repositories.analytics_repository import AnalyticsRepository
from app.api.v1.schemas.analytics import SupervisorAnalytics, AgentAnalytics

class AnalyticsService:
    def __init__(self):
        self.supabase = get_supabase_client()
        self.repository = AnalyticsRepository(self.supabase)

    async def get_supervisor_analytics(self, supervisor_id: UUID, time_period: str = "all_time") -> SupervisorAnalytics:
        """Get analytics for a specific supervisor."""
        return self.repository.get_supervisor_analytics(supervisor_id, time_period)

    async def get_agent_analytics(self, agent_id: UUID, time_period: str = "all_time") -> AgentAnalytics:
        """Get analytics for a specific agent."""
        return self.repository.get_agent_analytics(agent_id, time_period)
