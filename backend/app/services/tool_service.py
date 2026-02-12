"""Tool permission service."""

from fastapi import HTTPException
from datetime import datetime, timezone

from app.db.supabase import get_supabase_client


class ToolService:

    def __init__(self):
        self.db = get_supabase_client()

    # ============================
    # LIST PERMISSIONS
    # ============================
    def list_interaction_permissions(self, interaction_id: str, user_id: str):
        res = (
            self.db
            .table("tool_permissions")
            .select("*")
            .eq("interaction_id", interaction_id)
            .execute()
        )

        return res.data or []

    # ============================
    # RESPOND TO PERMISSION
    # ============================
    def respond_permission(self, permission_id: str, user_id: str, response: str):

        res = (
            self.db
            .table("tool_permissions")
            .select("*")
            .eq("id", permission_id)
            .limit(1)
            .execute()
        )

        if not res.data:
            raise HTTPException(404, "Permission not found")

        permission = res.data[0]

        if permission["status"] != "pending":
            raise HTTPException(409, "Already responded")

        updated = (
            self.db
            .table("tool_permissions")
            .update({
                "status": response,
                "responded_at": datetime.now(timezone.utc).isoformat(),
                "responded_by": user_id,
            })
            .eq("id", permission_id)
            .execute()
        )

        return updated.data[0]
