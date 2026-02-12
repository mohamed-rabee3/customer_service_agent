"""Analytics service."""

from app.repositories.analytics_repository import AnalyticsRepository


class AnalyticsService:
    def __init__(self):
        self.repo = AnalyticsRepository()

    def get_admin_analytics(self, agent_type: str | None):
        res = self.repo.get_system_analytics(agent_type)
        return res.data
