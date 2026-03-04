"""Interaction repository."""
from typing import List, Optional, Dict, Any
from uuid import UUID
from datetime import datetime
from supabase import Client
from app.api.v1.schemas.interaction import Interaction, InteractionDetail

class InteractionRepository:
    def __init__(self, supabase: Client):
        self.supabase = supabase

    def get_agent_ids_by_supervisor(self, user_id: UUID) -> List[str]:
        """Fetch all agent IDs belonging to a supervisor.
        
        NOTE: user_id is the auth user ID (from JWT). 
        The supervisors table uses 'userID' as PK (no 'id' column).
        agents.supervisor_id stores supervisors.userID.
        So we first find the supervisor's userID, then use it.
        """
        # Step 1: Check if this auth user has a supervisor record
        try:
            supervisor = self.supabase.table("supervisors")\
                .select("userID")\
                .eq("userID", str(user_id))\
                .execute()
        except Exception as e:
            print(f"Error looking up supervisor: {e}")
            return []
        
        if not supervisor.data:
            return []
        
        supervisor_user_id = supervisor.data[0]["userID"]
        
        # Step 2: Fetch agents where supervisor_id = supervisor's userID
        response = self.supabase.table("agents")\
            .select("id")\
            .eq("supervisor_id", str(supervisor_user_id))\
            .execute()
        
        return [item["id"] for item in response.data] if response.data else []

    def get_agent_ids_for_supervisor(self, supervisor_id: UUID) -> List[str]:
        """Fetch all agent IDs belonging to a supervisor by their supervisor UID (userID)."""
        response = self.supabase.table("agents")\
            .select("id")\
            .eq("supervisor_id", str(supervisor_id))\
            .execute()
        
        return [item["id"] for item in response.data] if response.data else []

    def get_interaction_detail(self, interaction_id: UUID) -> Optional[InteractionDetail]:
        """Get full details for an interaction."""
        try:
            response = self.supabase.table("interactions")\
                .select("*, agents(name)")\
                .eq("id", str(interaction_id))\
                .execute()
            
            if not response.data:
                return None
            
            data = response.data[0]
            interaction_id_str = str(interaction_id)
        
            # Map fields for Pydantic schema
            if "agents" in data and data["agents"]:
                 data["agent_name"] = data["agents"].get("name", "Unknown")
            else:
                 data["agent_name"] = "Unknown"
                 
            if "interaction_type" in data:
                data["type"] = data["interaction_type"]
            
            metrics = self.supabase.table("realtime_metrics")\
                .select("*")\
                .eq("interaction_id", interaction_id_str)\
                .order("timestamp")\
                .execute()
                
            permissions = self.supabase.table("tool_permissions")\
                .select("*")\
                .eq("interaction_id", interaction_id_str)\
                .execute()
                
            data["realtime_metrics"] = metrics.data
            data["tool_permissions"] = permissions.data
            
            # Map fields for Pydantic schema
            if "end_at" in data:
                data["ended_at"] = data["end_at"]
                
            if data.get("started_at") and data.get("end_at"):
                try:
                    start = datetime.fromisoformat(data["started_at"].replace('Z', '+00:00'))
                    end = datetime.fromisoformat(data["end_at"].replace('Z', '+00:00'))
                    data["duration_seconds"] = int((end - start).total_seconds())
                except (ValueError, TypeError):
                    data["duration_seconds"] = None
            
            return InteractionDetail.model_validate(data)
            
        except Exception as e:
            print(f"Error in get_interaction_detail: {e}")
            return None

    def get_interactions(
        self, 
        agent_ids: List[str], 
        page: int = 1, 
        limit: int = 20,
        status: Optional[str] = None
    ) -> Dict[str, Any]:
        """List interactions for specific agents."""
        query = self.supabase.table("interactions").select("*, agents(name)", count="exact")
        
        if agent_ids:
            query = query.in_("agent_id", agent_ids)
            
        if status:
            query = query.eq("status", status)
        
        start = (page - 1) * limit
        end = start + limit - 1
        query = query.order("started_at", desc=True).range(start, end)
        
        response = query.execute()
        
        items = []
        for item in response.data:
            # Map fields
            if "agents" in item and item["agents"]:
                item["agent_name"] = item["agents"].get("name", "Unknown")
            else:
                item["agent_name"] = "Unknown"
                
            if "interaction_type" in item:
                item["type"] = item["interaction_type"]
                
            # Map fields for Pydantic schema
            if "end_at" in item:
                item["ended_at"] = item["end_at"]
                
            if item.get("started_at") and item.get("end_at"):
                try:
                    start = datetime.fromisoformat(item["started_at"].replace('Z', '+00:00'))
                    end = datetime.fromisoformat(item["end_at"].replace('Z', '+00:00'))
                    item["duration_seconds"] = int((end - start).total_seconds())
                except (ValueError, TypeError):
                    item["duration_seconds"] = None
                
            items.append(Interaction.model_validate(item))
        
        return {
            "data": items,
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
            .limit(1)\
            .execute()
            
        if not current.data:
            return None
            
        start_time_str = current.data[0].get("started_at")
        updates = {
            "status": status, 
            "end_at": datetime.utcnow().isoformat()  # DB column is 'end_at', not 'ended_at'
        }
        
        # 3. Update (no select/join - not supported in this client version)
        self.supabase.table("interactions")\
            .update(updates)\
            .eq("id", str(interaction_id))\
            .execute()

        # 4. Fetch updated data with agent join
        response = self.supabase.table("interactions")\
            .select("*, agents(name)")\
            .eq("id", str(interaction_id))\
            .limit(1)\
            .execute()
            
        if not response.data:
            return None
            
        data = response.data[0]
        if "agents" in data and data["agents"]:
             data["agent_name"] = data["agents"].get("name", "Unknown")
        else:
             data["agent_name"] = "Unknown"
             
        if "interaction_type" in data:
            data["type"] = data["interaction_type"]
        
        # Map DB column 'end_at' to schema field 'ended_at'
        if "end_at" in data:
            data["ended_at"] = data["end_at"]
            
        return Interaction.model_validate(data)