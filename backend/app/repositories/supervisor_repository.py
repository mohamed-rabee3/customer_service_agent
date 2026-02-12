"""Supervisor repository."""

from app.db.supabase import get_supabase_client

class SupervisorRepository:

    def __init__(self):
        self.db = get_supabase_client()

    def list(self, supervisor_type, limit, offset):
        q = self.db.table("supervisors").select("*")
        if supervisor_type:
            q = q.eq("supervisor_type", supervisor_type)
        return q.range(offset, offset + limit - 1).execute()

    def get_by_id(self, supervisor_id):
        return self.db.table("supervisors") \
            .select("*") \
            .eq("userID", supervisor_id) \
            .execute()

    def create(self, payload):
        return self.db.table("supervisors").insert(payload).execute()

    def update(self, user_id, payload):
        return self.db.table("supervisors") \
            .update(payload) \
            .eq("userID", user_id) \
            .execute()
