from fastapi import HTTPException
from app.db.supabase import get_supabase_client
from app.repositories.archive_repository import ArchiveRepository


class ArchiveService:

    def __init__(self):
        self.repo = ArchiveRepository()
        self.db = get_supabase_client()

    def update_tags(self, interaction_id: str, user_id: str, tags: dict):

        supervisor_id = user_id

        res = (
            self.db
            .table("interactions")
            .select("id, agents!inner(supervisor_id)")
            .eq("id", interaction_id)
            .execute()
        )

        if not res.data:
            raise HTTPException(status_code=404, detail="Interaction not found")

        return self.repo.update_tags(interaction_id, tags)
