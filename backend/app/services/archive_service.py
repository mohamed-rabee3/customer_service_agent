"""Archive service."""
from typing import List, Optional, Dict, Any
from uuid import UUID
from datetime import datetime
from app.db.supabase import get_supabase_client
from app.repositories.archive_repository import ArchiveRepository

class ArchiveService:
    def __init__(self):
        self.repository = ArchiveRepository(get_supabase_client())

    async def get_archives(
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
        return self.repository.get_archives(
            agent_ids=agent_ids, page=page, limit=limit, agent_id=agent_id,
            from_date=from_date, to_date=to_date, phone_number=phone_number, tags=tags
        )

    async def get_archive_detail(self, interaction_id: UUID, agent_ids: List[str]) -> Optional[Dict[str, Any]]:
        return self.repository.get_archive_detail(interaction_id, agent_ids)
