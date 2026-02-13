"""Supervisor repository."""
from typing import List, Dict, Any
from supabase import Client

class SupervisorRepository:
    def __init__(self, supabase: Client):
        self.supabase = supabase

    def get_supervisors_by_performance(self, limit: int = 100) -> List[Dict[str, Any]]:
        """Fetch supervisors ordered by performance score."""
        response = self.supabase.table("supervisors")\
            .select("*")\
            .order("performance_score", desc=True)\
            .limit(limit)\
            .execute()
        return response.data or []

    def get_active_supervisor_stats(self) -> Dict[str, int]:
        """
        Get counts of active agents per supervisor using live interactions.
        Returns: Dict[supervisor_id: active_agents_count]
        """
        # Query interactions where status is NOT completed or failed (i.e., active)
        # Assuming 'in_progress', 'queued', 'ringing' etc are active statuses
        # Or simply status != 'completed' and status != 'failed'
        
        # We need to join with agents to get supervisor_id
        response = self.supabase.table("interactions")\
            .select("agent_id, agents!inner(supervisor_id)")\
            .neq("status", "completed")\
            .neq("status", "failed")\
            .execute()
            
        data = response.data or []
        stats = {}
        for item in data:
            if "agents" in item and "supervisor_id" in item["agents"]:
                sup_id = item["agents"]["supervisor_id"]
                stats[sup_id] = stats.get(sup_id, 0) + 1
        
        return stats

    def get_all_supervisors(
        self, 
        page: int = 1, 
        limit: int = 20
    ) -> Dict[str, Any]:
        """List all supervisors with pagination."""
        start = (page - 1) * limit
        end = start + limit - 1
        
        response = self.supabase.table("supervisors")\
            .select("*", count="exact")\
            .order("created_at", desc=True)\
            .range(start, end)\
            .execute()
            
        return {
            "data": response.data or [],
            "total": response.count or 0
        }
