from app.db.supabase import get_supabase_client


class AnalyticsRepository:

    def __init__(self):
        self.db = get_supabase_client()

    def get_system_analytics(self, agent_type: str | None = None):
        q = self.db.table("agent_analytics").select("*")

        if agent_type:
            q = q.eq("agent_type", agent_type)

        return q.execute()
