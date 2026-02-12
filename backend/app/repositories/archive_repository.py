from app.db.supabase import get_supabase_client
from datetime import datetime

class ArchiveRepository:

    def __init__(self):
        self.db = get_supabase_client()

    def get_by_interaction(self, interaction_id: str):
        return self.db.table("archives") \
            .select("*") \
            .eq("interaction_id", interaction_id) \
            .execute()

    def update_tags(self, interaction_id: str, tags: dict):
        return self.db.table("archives") \
            .update({
                "tags": tags,
                "updated_at": datetime.utcnow().isoformat()
            }) \
            .eq("interaction_id", interaction_id) \
            .execute()
