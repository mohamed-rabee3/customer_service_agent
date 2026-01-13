"""Archive repository."""
from typing import List, Optional, Dict, Any
from uuid import UUID
from datetime import datetime
from supabase import Client

class ArchiveRepository:
    def __init__(self, supabase: Client):
        self.supabase = supabase

    def get_archives(
        self,
        agent_ids: List[str],
        page: int = 1,
        limit: int = 20,
        agent_id: Optional[str] = None,
        from_date: Optional[datetime] = None,
        to_date: Optional[datetime] = None,
        phone_number: Optional[str] = None,
        tags: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """Get call/chat archive with dynamic filters."""
        query = self.supabase.table("archives").select("*", count="exact")

        # Security boundary
        query = query.in_("agent_id", agent_ids)

        if agent_id:
            query = query.eq("agent_id", agent_id)
        if from_date:
            query = query.gte("started_at", from_date.isoformat())
        if to_date:
            query = query.lte("started_at", to_date.isoformat())
        if phone_number:
            query = query.ilike("phone_number", f"%{phone_number}%")
        if tags:
            query = query.contains("tags", tags)

        start = (page - 1) * limit
        end = start + limit - 1
        query = query.order("started_at", desc=True).range(start, end)
        
        response = query.execute()
        
        return {
            "data": response.data,
            "total": response.count,
            "page": page,
            "limit": limit
        }

    def get_archive_detail(self, interaction_id: UUID, agent_ids: List[str]) -> Optional[Dict[str, Any]]:
        """Get detailed view of a specific archive."""
        response = self.supabase.table("archives")\
            .select("*")\
            .eq("interaction_id", str(interaction_id))\
            .in_("agent_id", agent_ids)\
            .execute()
            
        return response.data[0] if response.data else None
