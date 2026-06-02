"""Archive repository."""
from typing import List, Optional, Dict, Any
from uuid import UUID
from datetime import datetime
from supabase import Client


def _merge_interaction_and_archive_row(item: Dict[str, Any]) -> Dict[str, Any]:
    """Flatten PostgREST embed ``archive`` (1:1 on ``interaction_id``) onto the interaction row."""
    out = {k: v for k, v in item.items() if k != "archive"}
    arc = item.get("archive")
    if isinstance(arc, list):
        arc = arc[0] if arc else None
    if isinstance(arc, dict):
        out["summary"] = arc.get("summary") or out.get("summary")
        op = arc.get("overall_performance")
        if op is not None:
            try:
                out["overall_performance"] = float(op)
                out["csat_score"] = float(op)
            except (TypeError, ValueError):
                pass
        if arc.get("sentiment") is not None:
            out["sentiment"] = arc.get("sentiment")
    return out


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
        tags: Optional[List[str]] = None,
        interaction_type: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Get call/chat archive with dynamic filters.
        
        Archives are completed interactions (status='completed').
        """
        # Query interactions table with completed status (archives = completed interactions)
        # JOIN with agents to get agent_name
        query = self.supabase.table("interactions").select(
            "*, agents(name), archive(*)", count="exact"
        )
        query = query.eq("status", "completed")
        if interaction_type:
            query = query.eq("interaction_type", interaction_type)

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
        for raw in response.data:
            item = _merge_interaction_and_archive_row(raw)
            # Schema expects: interaction_id, agent_name, type (from interaction_type)

            # Map Agent Name
            agent_name = "Unknown"
            if item.get("agents"):
                agent_name = item["agents"].get("name", "Unknown")
            
            # Map Interaction Type
            i_type = item.get("interaction_type", "voice") # Default or map?
            
            # Helper to safely parse tags if string, list, or dict
            i_tags = item.get("tags") or []
            if isinstance(i_tags, list):
                i_tags = [str(x) for x in i_tags]
            elif isinstance(i_tags, str):
                 # if stored as string "tag1,tag2"
                 i_tags = i_tags.split(",")
            elif isinstance(i_tags, dict):
                 # if stored as dict {"topic": "x"} -> ["topic:x"]
                 i_tags = [f"{k}:{v}" for k, v in i_tags.items()]

            duration_seconds = item.get("duration_seconds")
            if duration_seconds is None and item.get("started_at") and item.get("end_at"):
                try:
                    s = datetime.fromisoformat(str(item["started_at"]).replace("Z", "+00:00"))
                    e = datetime.fromisoformat(str(item["end_at"]).replace("Z", "+00:00"))
                    duration_seconds = int((e - s).total_seconds())
                except Exception:
                    duration_seconds = None

            mapped_item = {
                **item,
                "interaction_id": item["id"], # Alias id to interaction_id
                "agent_name": agent_name,
                "type": i_type,
                "tags": i_tags,
                "duration_seconds": duration_seconds,
            }
            mapped_data.append(mapped_item)
        
        return {
            "data": mapped_data,
            "total": response.count,
            "page": page,
            "limit": limit
        }

    def _build_chat_transcript(self, interaction_id: str) -> str:
        """Load full chat transcript from persisted messages."""
        res = (
            self.supabase.table("chat_messages")
            .select("role, content")
            .eq("interaction_id", interaction_id)
            .order("created_at")
            .execute()
        )
        lines: list[str] = []
        for row in res.data or []:
            content = (row.get("content") or "").strip()
            if not content:
                continue
            role = row.get("role")
            if role == "customer":
                lines.append(f"Customer: {content}")
            elif role == "agent":
                lines.append(f"Agent: {content}")
            elif role == "supervisor":
                lines.append(f"Supervisor: {content}")
        return "\n".join(lines)

    def get_archive_detail(self, interaction_id: UUID, agent_ids: Optional[List[str]]) -> Optional[Dict[str, Any]]:
        """Get detailed view of a specific archive (completed interaction)."""
        query = (
            self.supabase.table("interactions")
            .select("*, agents(name), archive(*)")
            .eq("id", str(interaction_id))
            .in_("status", ["completed", "abandoned"])
        )
            
        # Security: Apply agent filter only if not Admin (agent_ids is not None)
        if agent_ids is not None:
             query = query.in_("agent_id", agent_ids)

        response = query.execute()
        
        if not response.data:
            return None
            
        item = _merge_interaction_and_archive_row(response.data[0])

        # Map fields similarly to get_archives
        agent_name = "Unknown"
        if item.get("agents"):
            agent_name = item["agents"].get("name", "Unknown")
        
        i_type = item.get("interaction_type", "voice")
        
        i_tags = item.get("tags") or []
        if isinstance(i_tags, list):
            i_tags = [str(x) for x in i_tags]
        elif isinstance(i_tags, str):
             i_tags = i_tags.split(",")
        elif isinstance(i_tags, dict):
             i_tags = [f"{k}:{v}" for k, v in i_tags.items()]

        duration_seconds = item.get("duration_seconds")
        if duration_seconds is None and item.get("started_at") and item.get("end_at"):
            try:
                s = datetime.fromisoformat(str(item["started_at"]).replace("Z", "+00:00"))
                e = datetime.fromisoformat(str(item["end_at"]).replace("Z", "+00:00"))
                duration_seconds = int((e - s).total_seconds())
            except Exception:
                duration_seconds = None

        transcript = item.get("transcript")
        if i_type == "chat" and not (transcript and str(transcript).strip()):
            transcript = self._build_chat_transcript(str(interaction_id))

        mapped_item = {
            **item,
            "interaction_id": item["id"],
            "agent_name": agent_name,
            "type": i_type,
            "tags": i_tags,
            "issues": item.get("issues") or [],
            "ended_at": item.get("end_at"),
            "duration_seconds": duration_seconds,
            "transcript": transcript,
        }

        return mapped_item

