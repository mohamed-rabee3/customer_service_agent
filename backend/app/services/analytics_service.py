"""Analytics service layer."""
from time import time
from typing import List, Dict, Any, Optional
from uuid import UUID
from app.db.supabase import get_supabase_service_client
from app.repositories.analytics_repository import AnalyticsRepository
from app.api.v1.schemas.analytics import SupervisorAnalytics, AgentAnalytics, AdminAnalytics

_ADMIN_ANALYTICS_CACHE: dict[str, tuple[float, AdminAnalytics]] = {}
_SUPERVISOR_ANALYTICS_CACHE: dict[str, tuple[float, SupervisorAnalytics]] = {}
_CACHE_TTL_SECONDS = 30.0


class AnalyticsService:
    def __init__(self):
        self.supabase = get_supabase_service_client()
        self.repository = AnalyticsRepository(self.supabase)

    async def get_supervisor_analytics(self, supervisor_id: UUID, time_period: str = "all_time") -> SupervisorAnalytics:
        """Get analytics for a specific supervisor."""
        cache_key = f"{supervisor_id}:{time_period}"
        now = time()
        cached = _SUPERVISOR_ANALYTICS_CACHE.get(cache_key)
        if cached and (now - cached[0]) < _CACHE_TTL_SECONDS:
            return cached[1]

        result = self.repository.get_supervisor_analytics(supervisor_id, time_period)
        _SUPERVISOR_ANALYTICS_CACHE[cache_key] = (now, result)
        return result

    async def get_agent_analytics(self, agent_id: UUID, time_period: str = "all_time") -> AgentAnalytics:
        """Get analytics for a specific agent."""
        return self.repository.get_agent_analytics(agent_id, time_period)

    async def get_admin_analytics(self, time_period: str = "all_time") -> AdminAnalytics:
        """Get aggregate analytics across all supervisors for admin dashboard."""
        now = time()
        cached = _ADMIN_ANALYTICS_CACHE.get(time_period)
        if cached and (now - cached[0]) < _CACHE_TTL_SECONDS:
            return cached[1]

        result = self.repository.get_admin_analytics(time_period)
        _ADMIN_ANALYTICS_CACHE[time_period] = (now, result)
        return result
