"""Archive service."""
from typing import List, Optional, Dict, Any
from uuid import UUID
from datetime import datetime
from app.db.supabase import get_supabase_service_client
from app.repositories.archive_repository import ArchiveRepository

class ArchiveService:
    def __init__(self):
        # Service role: archive routes already scope by supervisor agent_ids in the API layer.
        self.repository = ArchiveRepository(get_supabase_service_client())

    async def get_archives(
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
        return self.repository.get_archives(
            agent_ids=agent_ids, page=page, limit=limit, agent_id=agent_id,
            from_date=from_date, to_date=to_date, phone_number=phone_number, tags=tags,
            interaction_type=interaction_type,
        )

    async def get_archive_detail(self, interaction_id: UUID, agent_ids: List[str]) -> Optional[Dict[str, Any]]:
        return self.repository.get_archive_detail(interaction_id, agent_ids)

    async def summarize_chat_session(self, interaction_id: UUID) -> None:
        """
        Summarize a chat session by fetching messages, building transcript, and archiving.
        """
        from app.agents.base_agent import archive_chat_interaction
        from app.agents.chat_session_manager import _transcript_lines_from_db_rows

        db = get_supabase_service_client()
        
        # Fetch the complete chat history for this interaction
        history_res = (
            db.table("chat_messages")
            .select("role, content")
            .eq("interaction_id", str(interaction_id))
            .order("created_at")
            .execute()
        )
        
        if not history_res.data:
            return
            
        transcript_lines = _transcript_lines_from_db_rows(history_res.data)
        if not transcript_lines:
            return
            
        joined_transcript = "\n".join(transcript_lines)
        await archive_chat_interaction(str(interaction_id), joined_transcript)

