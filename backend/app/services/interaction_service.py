"""Interaction service."""
from typing import Dict, Any, List, Optional
from uuid import UUID
from app.db.supabase import get_supabase_client
from app.repositories.interaction_repository import InteractionRepository
from app.api.v1.schemas.interaction import InteractionDetail, Interaction

class InteractionService:
    def __init__(self):
        self.repository = InteractionRepository(get_supabase_client())

    async def get_interaction_detail(self, interaction_id: UUID) -> Optional[InteractionDetail]:
        return self.repository.get_interaction_detail(interaction_id)

    async def get_agent_ids(self, supervisor_id: UUID) -> List[str]:
        """Get agent IDs for a supervisor."""
        return self.repository.get_agent_ids_by_supervisor(supervisor_id)

    async def get_interactions(
        self, 
        agent_ids: List[str], 
        page: int = 1, 
        limit: int = 20,
        status: Optional[str] = None
    ) -> Dict[str, Any]:
         return self.repository.get_interactions(agent_ids, page, limit, status)

    async def update_interaction_status(self, interaction_id: UUID, status: str) -> Optional[Interaction]:
         if status not in ["completed", "failed"]:
             # Optional: Enforce valid status transitions
             pass
         return self.repository.update_status(interaction_id, status)