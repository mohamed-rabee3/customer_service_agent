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
