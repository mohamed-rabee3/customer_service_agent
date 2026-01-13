"""Interaction repository."""
from typing import List, Optional, Dict, Any
from uuid import UUID
from datetime import datetime
from supabase import Client
from app.api.v1.schemas.interaction import Interaction, InteractionDetail

class InteractionRepository:
    def __init__(self, supabase: Client):
        self.supabase = supabase

    def get_agent_ids_by_supervisor(self, supervisor_id: UUID) -> List[str]:
        """Fetch all agent IDs belonging to a supervisor."""
        response = self.supabase.table("agents")\
            .select("id")\
            .eq("supervisor_id", str(supervisor_id))\
            .execute()
        
        return [item["id"] for item in response.data] if response.data else []

    def get_interaction_detail(self, interaction_id: UUID) -> Optional[InteractionDetail]:
        """Get full details for an interaction."""
        response = self.supabase.table("interactions")\
            .select("*")\
            .eq("id", str(interaction_id))\
            .single()\
            .execute()
            
        if not response.data:
            return None
            
        data = response.data
        interaction_id_str = str(interaction_id)
        
        metrics = self.supabase.table("realtime_metrics")\
            .select("*")\
            .eq("interaction_id", interaction_id_str)\
            .order("created_at")\
            .execute()
            
        permissions = self.supabase.table("tool_permissions")\
            .select("*")\
            .eq("interaction_id", interaction_id_str)\
            .execute()
            
        data["realtime_metrics"] = metrics.data
        data["tool_permissions"] = permissions.data
        
        return InteractionDetail.model_validate(data)

    def get_interactions(
        self, 
        agent_ids: List[str], 
        page: int = 1, 
        limit: int = 20,
        status: Optional[str] = None
    ) -> Dict[str, Any]:
        """List interactions for specific agents."""
        query = self.supabase.table("interactions").select("*", count="exact")
        
        if agent_ids:
            query = query.in_("agent_id", agent_ids)
            
        if status:
            query = query.eq("status", status)
        
        start = (page - 1) * limit
        end = start + limit - 1
        query = query.order("started_at", desc=True).range(start, end)
        
        response = query.execute()
        
        return {
            "data": [Interaction.model_validate(item) for item in response.data],
            "total": response.count,
            "page": page,
            "limit": limit
        }

    def update_status(self, interaction_id: UUID, status: str) -> Optional[Interaction]:
        """Update interaction status and duration."""
        # 1. Fetch current interaction to get started_at
        current = self.supabase.table("interactions")\
            .select("started_at")\
            .eq("id", str(interaction_id))\
            .single()\
            .execute()
            
        if not current.data:
            return None
            
        start_time_str = current.data.get("started_at")
        updates = {
            "status": status, 
            "ended_at": datetime.utcnow().isoformat()
        }
        
        # 2. Calculate duration if completed/failed
        if status in ["completed", "failed"] and start_time_str:
            try:
                # Handle ISO format with or without milliseconds/timezone
                start_dt = datetime.fromisoformat(start_time_str.replace('Z', '+00:00'))
                end_dt = datetime.fromisoformat(updates["ended_at"])
                duration = int((end_dt - start_dt).total_seconds())
                updates["duration_seconds"] = max(0, duration)
            except ValueError:
                pass # Parse error fallback
        
        # 3. Update
        response = self.supabase.table("interactions")\
            .update(updates)\
            .eq("id", str(interaction_id))\
            .select("*")\
            .single()\
            .execute()
            
        if not response.data:
            return None
            
        return Interaction.model_validate(response.data)