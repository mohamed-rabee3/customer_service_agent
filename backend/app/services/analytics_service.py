"""Analytics service."""
from typing import List, Dict, Any, Optional
from uuid import UUID
from datetime import datetime, timedelta
from app.db.supabase import get_supabase_client
from app.api.v1.schemas.analytics import SupervisorAnalytics, AgentAnalytics

class AnalyticsService:
    def __init__(self):
        self.supabase = get_supabase_client()

    async def get_supervisor_analytics(self, supervisor_id: UUID, time_period: str = "all_time") -> SupervisorAnalytics:
        """Get analytics for a specific supervisor."""
        agents_res = self.supabase.table("agents").select("id, name").eq("supervisor_id", str(supervisor_id)).execute()
        agents = agents_res.data or []
        agent_ids = [a["id"] for a in agents]
        agent_names = {a["id"]: a["name"] for a in agents}
        
        if not agent_ids:
            return SupervisorAnalytics(
                performance_score=0.0, fcr_percentage=0.0, avg_csat=0.0, avg_handle_time=0.0, total_interactions=0, agents_breakdown=[]
            )

        query = self.supabase.table("archives").select("agent_id, duration_seconds, csat_score, fcr_status").in_("agent_id", agent_ids)
        
        if time_period != "all_time":
            now = datetime.utcnow()
            if time_period == "today": start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
            elif time_period == "week": start_date = now - timedelta(days=7)
            elif time_period == "month": start_date = now - timedelta(days=30)
            query = query.gte("started_at", start_date.isoformat())
            
        data = query.execute().data or []
        total = len(data)
        
        if total == 0:
            breakdown = [AgentAnalytics(agent_id=aid, agent_name=agent_names[aid], total_interactions=0, avg_handle_time=0, fcr_percentage=0, avg_csat=0, performance_score=0) for aid in agent_ids]
            return SupervisorAnalytics(performance_score=0, fcr_percentage=0, avg_csat=0, avg_handle_time=0, total_interactions=0, agents_breakdown=breakdown)

        total_duration = sum(i.get("duration_seconds") or 0 for i in data)
        total_csat = sum(i.get("csat_score") or 0 for i in data)
        total_fcr = sum(1 for i in data if i.get("fcr_status"))
        
        agent_stats = {aid: {"count": 0, "duration": 0, "csat": 0, "fcr": 0} for aid in agent_ids}
        for i in data:
            aid = i["agent_id"]
            agent_stats[aid]["count"] += 1
            agent_stats[aid]["duration"] += (i.get("duration_seconds") or 0)
            agent_stats[aid]["csat"] += (i.get("csat_score") or 0)
            if i.get("fcr_status"): agent_stats[aid]["fcr"] += 1
            
        breakdown = []
        for aid, s in agent_stats.items():
            count = s["count"]
            if count > 0:
                breakdown.append(AgentAnalytics(
                    agent_id=aid, agent_name=agent_names[aid], total_interactions=count,
                    avg_handle_time=s["duration"]/count, fcr_percentage=(s["fcr"]/count)*100,
                    avg_csat=s["csat"]/count, performance_score=(s["fcr"]/count)*60 + (s["csat"]/count)*0.4
                ))
            else:
                breakdown.append(AgentAnalytics(agent_id=aid, agent_name=agent_names[aid], total_interactions=0, avg_handle_time=0, fcr_percentage=0, avg_csat=0, performance_score=0))

        return SupervisorAnalytics(
            performance_score=(total_fcr/total)*60 + (total_csat/total)*0.4,
            fcr_percentage=(total_fcr/total)*100,
            avg_csat=total_csat/total,
            avg_handle_time=total_duration/total,
            total_interactions=total,
            agents_breakdown=breakdown
        )

    async def get_agent_analytics(self, agent_id: UUID, time_period: str = "all_time") -> AgentAnalytics:
        """Get analytics for a specific agent."""
        agent_res = self.supabase.table("agents").select("name").eq("id", str(agent_id)).single().execute()
        agent_name = agent_res.data.get("name", "Unknown") if agent_res.data else "Unknown"
        
        query = self.supabase.table("archives").select("duration_seconds, csat_score, fcr_status").eq("agent_id", str(agent_id))
        
        if time_period != "all_time":
            now = datetime.utcnow()
            if time_period == "today": start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
            elif time_period == "week": start_date = now - timedelta(days=7)
            elif time_period == "month": start_date = now - timedelta(days=30)
            query = query.gte("started_at", start_date.isoformat())
            
        data = query.execute().data or []
        count = len(data)
        
        if count == 0:
            return AgentAnalytics(agent_id=str(agent_id), agent_name=agent_name, total_interactions=0, avg_handle_time=0, fcr_percentage=0, avg_csat=0, performance_score=0)
            
        dur = sum(i.get("duration_seconds") or 0 for i in data)
        csat = sum(i.get("csat_score") or 0 for i in data)
        fcr = sum(1 for i in data if i.get("fcr_status"))
        
        return AgentAnalytics(
            agent_id=str(agent_id), agent_name=agent_name, total_interactions=count,
            avg_handle_time=dur/count, fcr_percentage=(fcr/count)*100,
            avg_csat=csat/count, performance_score=(fcr/count)*60 + (csat/count)*0.4
        )
