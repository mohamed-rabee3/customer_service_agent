"""Supervisor service."""
from typing import List, Dict, Any
from app.db.supabase import get_supabase_client
from app.repositories.supervisor_repository import SupervisorRepository

class SupervisorService:
    def __init__(self):
        self.repository = SupervisorRepository(get_supabase_client())

    async def get_supervisors(self, page: int = 1, limit: int = 20) -> Dict[str, Any]:
        """Fetch paginated list of supervisors."""
        return self.repository.get_all_supervisors(page, limit)
