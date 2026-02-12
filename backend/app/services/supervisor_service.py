"""Supervisor service."""

from datetime import datetime, timezone
from fastapi import HTTPException

from app.db.supabase import get_supabase_client, get_supabase_service_client
from app.repositories.supervisor_repository import SupervisorRepository
from app.api.v1.schemas.supervisor import SupervisorCreate, SupervisorUpdate


class SupervisorService:

    def __init__(self):
        self.repo = SupervisorRepository()
        self.db = get_supabase_client()
        self.supabase_auth = get_supabase_service_client()

    # ============================
    # LIST
    # ============================
    def list(self, supervisor_type, page, limit):
        offset = (page - 1) * limit
        return self.repo.list(supervisor_type, limit, offset).data

    # ============================
    # CREATE
    # ============================
    def create_supervisor(self, data: SupervisorCreate):

        auth_user = self.supabase_auth.auth.admin.create_user({
            "email": data.email,
            "password": data.password,
            "email_confirm": True
        })

        if not auth_user or not auth_user.user:
            raise HTTPException(400, "Failed to create auth user")

        return self.repo.create({
            "userID": auth_user.user.id,
            "supervisor_type": data.supervisor_type,
        }).data[0]

    # ============================
    # UPDATE
    # ============================
    def update_supervisor(self, supervisor_id: str, data: SupervisorUpdate):

        current = self.repo.get_by_id(supervisor_id).data
        if not current:
            raise HTTPException(404, "Supervisor not found")

        payload = {k: v for k, v in data.model_dump().items() if v is not None}

        if not payload:
            raise HTTPException(400, "No fields to update")

        payload["updated_at"] = datetime.now(timezone.utc).isoformat()

        result = self.repo.update(supervisor_id, payload)

        if not result.data:
            raise HTTPException(409, "Update blocked by database policy")

        return result.data[0]

    # ============================
    # DELETE (DANGEROUS)
    # ============================
    def delete_supervisor(self, supervisor_id: str, deleted_by: str):

        current = self.repo.get_by_id(supervisor_id).data
        if not current:
            raise HTTPException(404, "Supervisor not found")

        # Get agents for supervisor
        agents = (
            self.db
            .table("agents")
            .select("id")
            .eq("supervisor_id", supervisor_id)
            .execute()
        )

        agent_ids = [a["id"] for a in agents.data or []]

        # Check active interactions
        if agent_ids:
            active = (
                self.db
                .table("interactions")
                .select("id")
                .in_("agent_id", agent_ids)
                .eq("status", "active")
                .execute()
            )

            if active.data:
                raise HTTPException(
                    409,
                    "Cannot delete supervisor with active calls/chats"
                )

        # Cascade delete interactions
        if agent_ids:
            self.db.table("interactions") \
                .delete() \
                .in_("agent_id", agent_ids) \
                .execute()

            self.db.table("agents") \
                .delete() \
                .in_("id", agent_ids) \
                .execute()

        # Delete supervisor
        self.db.table("supervisors") \
            .delete() \
            .eq("userID", supervisor_id) \
            .execute()

        # (Optional) Delete auth user
        self.supabase_auth.auth.admin.delete_user(supervisor_id)

        # Audit log placeholder
        print(f"[AUDIT] Supervisor {supervisor_id} deleted by {deleted_by}")

        return {"status": "deleted"}
