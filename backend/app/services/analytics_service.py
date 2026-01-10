from datetime import datetime, timedelta, timezone
from fastapi import HTTPException
from app.db.supabase_client import supabase


class AnalyticsService:
    @staticmethod
    def _calculate_metrics(archives):
        total = len(archives)
        if total == 0: return None

        avg_csat = sum(item.get('csat_score', 0) or 0 for item in archives) / total
        fcr_count = sum(1 for item in archives if item.get('fcr_status') is True)
        avg_handle_time = sum(item.get('resolution_time_seconds', 0) or 0 for item in archives) / total

        return {
            "total_interactions": total,
            "fcr_percentage": round((fcr_count / total) * 100, 2),
            "avg_csat": round(avg_csat, 2),
            "avg_handle_time": round(avg_handle_time, 2),
            "performance_score": round(avg_csat * 20, 2)
        }

    @staticmethod
    async def get_supervisor_stats(supervisor_id: str, period: str, current_user):
        if current_user.role != "admin" and str(current_user.id) != str(supervisor_id):
            raise HTTPException(status_code=403, detail="Unauthorized")

        now = datetime.now(timezone.utc)
        start_date = None
        if period == "today":
            start_date = now.replace(hour=0, minute=0, second=0)
        elif period == "week":
            start_date = now - timedelta(days=7)
        elif period == "month":
            start_date = now - timedelta(days=30)

        agents_res = supabase.table("agents").select("id, full_name").eq("supervisor_id", supervisor_id).execute()
        agent_ids = [a['id'] for a in agents_res.data]

        query = supabase.table("archives").select("*").in_("agent_id", agent_ids)
        if start_date: query = query.gte("started_at", start_date.isoformat())
        archives = query.execute().data

        base_stats = AnalyticsService._calculate_metrics(archives) or {
            "total_interactions": 0, "fcr_percentage": 0, "avg_csat": 0, "avg_handle_time": 0, "performance_score": 0
        }

        breakdown = []
        for agent in agents_res.data:
            agent_data = [a for a in archives if a['agent_id'] == agent['id']]
            a_stats = AnalyticsService._calculate_metrics(agent_data)
            if a_stats:
                breakdown.append({"agent_id": agent['id'], "agent_name": agent['full_name'], **a_stats})

        base_stats["agents_breakdown"] = breakdown
        return base_stats

    @staticmethod
    async def get_agent_stats(agent_id: str, period: str, current_user):
        agent_check = supabase.table("agents").select("id, full_name").eq("id", agent_id).eq("supervisor_id",
                                                                                             current_user.id).execute()
        if not agent_check.data: raise HTTPException(status_code=403, detail="Unauthorized")

        now = datetime.now(timezone.utc)
        start_date = None
        if period == "today":
            start_date = now.replace(hour=0, minute=0, second=0)
        elif period == "week":
            start_date = now - timedelta(days=7)
        elif period == "month":
            start_date = now - timedelta(days=30)

        query = supabase.table("archives").select("*").eq("agent_id", agent_id)
        if start_date: query = query.gte("started_at", start_date.isoformat())
        archives = query.execute().data

        stats = AnalyticsService._calculate_metrics(archives) or {
            "total_interactions": 0, "fcr_percentage": 0, "avg_csat": 0, "avg_handle_time": 0, "performance_score": 0
        }
        return {"agent_id": agent_id, "agent_name": agent_check.data[0]['full_name'], **stats}