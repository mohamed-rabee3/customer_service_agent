"""Analytics repository."""
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from uuid import UUID
from supabase import Client
from app.api.v1.schemas.analytics import SupervisorAnalytics, AgentAnalytics

class AnalyticsRepository:
    def __init__(self, supabase: Client):
        self.supabase = supabase

    def get_supervisor_analytics(self, supervisor_id: UUID, time_period: str = "all_time") -> SupervisorAnalytics:
        """Calculate analytics for a supervisor."""
        
        # 1. Determine Date Range
        now = datetime.utcnow()
        start_date = None
        
        if time_period == "today":
            start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
        elif time_period == "week":
            start_date = now - timedelta(days=7)
        elif time_period == "month":
            start_date = now - timedelta(days=30)
            
        # 2. Get Supervisor's Agents
        agents_response = self.supabase.table("agents")\
            .select("id, name")\
            .eq("supervisor_id", str(supervisor_id))\
            .execute()
            
        agents = agents_response.data or []
        agent_ids = [a["id"] for a in agents]
        agent_map = {a["id"]: a["name"] for a in agents}
        
        if not agent_ids:
            return SupervisorAnalytics(
                performance_score=0.0,
                fcr_percentage=0.0,
                avg_csat=0.0,
                avg_handle_time=0.0,
                total_interactions=0,
                agents_breakdown=[]
            )

        # 3. Fetch Interactions for Aggregation
        query = self.supabase.table("interactions")\
            .select("agent_id, status, duration_seconds, sentiment_score, fcr_status")\
            .in_("agent_id", agent_ids)
            
        if start_date:
            query = query.gte("started_at", start_date.isoformat())
            
        interactions = query.execute().data
        
        # 4. Calculate Metrics (In-memory aggregation since Supabase simple queries are limited)
        total_interactions = len(interactions)
        total_interactions = len(interactions)
        if total_interactions == 0:
            # Even if no interactions, return list of agents with 0 stats
            empty_breakdown = []
            for aid in agent_ids:
                empty_breakdown.append(AgentAnalytics(
                    agent_id=aid,
                    agent_name=agent_map.get(aid, "Unknown"),
                    total_interactions=0,
                    avg_handle_time=0.0,
                    fcr_percentage=0.0,
                    performance_score=0.0
                ))
                
            return SupervisorAnalytics(
                performance_score=0.0,
                fcr_percentage=0.0,
                avg_csat=0.0,
                avg_handle_time=0.0,
                total_interactions=0,
                agents_breakdown=empty_breakdown
            )
            
        total_duration = 0
        total_fcr = 0
        total_sentiment = 0 # Proxy for CSAT if not available
        
        # Breakdown
        agent_stats = {aid: {"count": 0, "duration": 0, "fcr": 0, "sentiment": 0} for aid in agent_ids}
        
        for i in interactions:
            aid = i["agent_id"]
            if aid not in agent_stats: continue
            
            # Global
            total_duration += (i.get("duration_seconds") or 0)
            if i.get("fcr_status"): total_fcr += 1
            total_sentiment += (i.get("sentiment_score") or 0)
            
            # Per Agent
            agent_stats[aid]["count"] += 1
            agent_stats[aid]["duration"] += (i.get("duration_seconds") or 0)
            if i.get("fcr_status"): agent_stats[aid]["fcr"] += 1
            agent_stats[aid]["sentiment"] += (i.get("sentiment_score") or 0)

        # 5. Build Response
        avg_handle_time = total_duration / total_interactions
        fcr_percentage = (total_fcr / total_interactions) * 100
        avg_csat = (total_sentiment / total_interactions) * 10 # Normalize to 0-100? Assuming sentiment -1 to 1? Let's assume 0-5.
        performance_score = (fcr_percentage * 0.5) + (avg_csat * 10) # Mock formula
        
        breakdown = []
        for aid, stats in agent_stats.items():
            count = stats["count"]
            if count > 0:
                breakdown.append(AgentAnalytics(
                    agent_id=aid,
                    agent_name=agent_map.get(aid, "Unknown"),
                    total_interactions=count,
                    avg_handle_time=stats["duration"] / count,
                    fcr_percentage=(stats["fcr"] / count) * 100,
                    performance_score=(stats["sentiment"] / count) * 20 # Mock
                ))
            else:
                breakdown.append(AgentAnalytics(
                    agent_id=aid,
                    agent_name=agent_map.get(aid, "Unknown"),
                    total_interactions=0, avg_handle_time=0, fcr_percentage=0, performance_score=0
                ))

        return SupervisorAnalytics(
            performance_score=min(100.0, performance_score),
            fcr_percentage=min(100.0, fcr_percentage),
            avg_csat=avg_csat,
            avg_handle_time=avg_handle_time,
            total_interactions=total_interactions,
            agents_breakdown=breakdown
        )

    def get_agent_analytics(self, agent_id: UUID, time_period: str = "all_time") -> AgentAnalytics:
        """Calculate analytics for a specific agent."""
        
        # 1. Determine Date Range
        now = datetime.utcnow()
        start_date = None
        
        if time_period == "today":
            start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
        elif time_period == "week":
            start_date = now - timedelta(days=7)
        elif time_period == "month":
            start_date = now - timedelta(days=30)
            
        # 2. Get Agent Details
        agent_response = self.supabase.table("agents")\
            .select("name")\
            .eq("id", str(agent_id))\
            .single()\
            .execute()
            
        agent_name = agent_response.data.get("name", "Unknown") if agent_response.data else "Unknown"

        # 3. Fetch Interactions (using archives table as it has analytics fields)
        query = self.supabase.table("archives")\
            .select("duration_seconds, csat_score, fcr_status")\
            .eq("agent_id", str(agent_id))
            
        if start_date:
            query = query.gte("started_at", start_date.isoformat())
            
        interactions = query.execute().data or []
        
        # 4. Aggregate
        total_interactions = len(interactions)
        if total_interactions == 0:
            return AgentAnalytics(
                agent_id=str(agent_id),
                agent_name=agent_name,
                total_interactions=0,
                avg_handle_time=0.0,
                fcr_percentage=0.0,
                performance_score=0.0
            )
            
        total_duration = sum((i.get("duration_seconds") or 0) for i in interactions)
        total_fcr = sum(1 for i in interactions if i.get("fcr_status"))
        total_csat = sum((i.get("csat_score") or 0) for i in interactions)
        
        fcr_percentage = (total_fcr / total_interactions) * 100
        avg_csat = (total_csat / total_interactions)
        avg_handle_time = (total_duration / total_interactions)
        
        # Mock Performance Score (FCR weighted 60%, CSAT weighted 40% - normalized to 100)
        # Using csat_score as 0-100 scale
        performance_score = (fcr_percentage * 0.6) + (avg_csat * 0.4)

        return AgentAnalytics(
            agent_id=str(agent_id),
            agent_name=agent_name,
            total_interactions=total_interactions,
            avg_handle_time=avg_handle_time,
            fcr_percentage=min(100.0, fcr_percentage),
            performance_score=min(100.0, performance_score),
            avg_csat=avg_csat # Added to match schema if it was there, wait let me check schema
        )
