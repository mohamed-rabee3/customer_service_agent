from app.db.supabase import get_supabase_client
from datetime import datetime, timezone

class ToolPermissionRepository:

    def __init__(self):
        self.db = get_supabase_client()

    def get_by_id(self, pid: str):
        return self.db.table("tool_permissions") \
            .select("*") \
            .eq("id", pid) \
            .execute()

    def list_by_interaction(self, interaction_id: str):
        return self.db.table("tool_permissions") \
            .select("*") \
            .eq("interaction_id", interaction_id) \
            .execute()

    def respond(self, pid: str, response: str):
        return self.db.table("tool_permissions") \
            .update({
                "status": response,
                "supervisor_response": response,
                "responded_at": datetime.now(timezone.utc).isoformat()
            }) \
            .eq("id", pid) \
            .execute()
