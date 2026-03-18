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
        """Get call/chat archive with dynamic filters.
        
        Archives are completed interactions (status='completed').
        """
        # Query interactions table with completed status (archives = completed interactions)
        # JOIN with agents to get agent_name
        query = self.supabase.table("interactions").select("*, agents(name)", count="exact")
        query = query.eq("status", "completed")

        # Security boundary: only allow user's agents
        # If agent_ids is empty/None (admin bypassing), skip? 
        # But here agent_ids is passed from Service which might have filtered for non-admin.
        # If Admin passed None to Service -> Service passes None here?
        # The signature says List[str], but let's be safe.
        if agent_ids:
            query = query.in_("agent_id", agent_ids)

        # Apply optional filters
        if agent_id:
            query = query.eq("agent_id", agent_id)
        if from_date:
            query = query.gte("started_at", from_date.isoformat())
        if to_date:
            query = query.lte("started_at", to_date.isoformat())
        if phone_number:
            query = query.ilike("phone_number", f"%{phone_number}%")
        if tags:
            # Tags in DB is jsonb/array. 
            # .contains() works if tags is ['a', 'b'].
            query = query.contains("tags", tags)

        # Pagination
        start = (page - 1) * limit
        end = start + limit - 1
        query = query.order("started_at", desc=True).range(start, end)
        
        response = query.execute()
        
        # Map response to Schema format
        mapped_data = []
        for item in response.data:
            # Schema expects: interaction_id, agent_name, type (from interaction_type)
            
            # Map Agent Name
            agent_name = "Unknown"
            if item.get("agents"):
                agent_name = item["agents"].get("name", "Unknown")
            
            # Map Interaction Type
            i_type = item.get("interaction_type", "voice") # Default or map?
            
            # Helper to safely parse tags if string or dict
            i_tags = item.get("tags") or []
            if isinstance(i_tags, str):
                 # if stored as string "tag1,tag2"
                 i_tags = i_tags.split(",")
            elif isinstance(i_tags, dict):
                 # if stored as dict {"topic": "x"} -> ["topic:x"]
                 i_tags = [f"{k}:{v}" for k, v in i_tags.items()]
            
            mapped_item = {
                **item,
                "interaction_id": item["id"], # Alias id to interaction_id
                "agent_name": agent_name,
                "type": i_type,
                "tags": i_tags
            }
            mapped_data.append(mapped_item)
        
        return {
            "data": mapped_data,
            "total": response.count,
            "page": page,
            "limit": limit
        }

    def get_archive_detail(self, interaction_id: UUID, agent_ids: Optional[List[str]]) -> Optional[Dict[str, Any]]:
        """Get detailed view of a specific archive (completed interaction)."""
        query = self.supabase.table("interactions")\
            .select("*, agents(name)")\
            .eq("id", str(interaction_id))\
            .eq("status", "completed")
            
        # Security: Apply agent filter only if not Admin (agent_ids is not None)
        if agent_ids is not None:
             query = query.in_("agent_id", agent_ids)

        response = query.execute()
        
        if not response.data:
            return None
            
        item = response.data[0]
        
        # Map fields similarly to get_archives
        agent_name = "Unknown"
        if item.get("agents"):
            agent_name = item["agents"].get("name", "Unknown")
        
        i_type = item.get("interaction_type", "voice")
        
        i_tags = item.get("tags") or []
        if isinstance(i_tags, str):
             i_tags = i_tags.split(",")
        elif isinstance(i_tags, dict):
             i_tags = [f"{k}:{v}" for k, v in i_tags.items()]
             
        mapped_item = {
            **item,
            "interaction_id": item["id"],
            "agent_name": agent_name,
            "type": i_type,
            "tags": i_tags,
            "issues": item.get("issues") or [],
            "ended_at": item.get("end_at"),
        }
            
        return mapped_item

