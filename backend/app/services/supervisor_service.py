"""Supervisor service - Business logic layer for supervisor operations."""

from datetime import datetime, timezone
from uuid import UUID

from fastapi import HTTPException, status

from app.api.v1.schemas.supervisor import SupervisorCreate, SupervisorUpdate
from app.core.constants import SupervisorType, UserRole
from app.core.exceptions import ForbiddenException, NotFoundException
from app.db.supabase import get_supabase_client, get_supabase_service_client
from app.repositories.supervisor_repository import SupervisorModel, supervisor_repository


def get_supervisor_dashboard(supervisor_id: UUID) -> dict:
    """
    Get dashboard data for a supervisor.
    """
    # Verify supervisor exists
    supervisor = supervisor_repository.get_by_id(supervisor_id)
    if supervisor is None:
        raise NotFoundException("Supervisor not found")

    # Get aggregated dashboard data efficiently
    enriched_agents = supervisor_repository.get_dashboard_data(supervisor_id)

    return {
        "agents": enriched_agents,
        "total": len(enriched_agents),
    }


def list_supervisors(
    page: int = 1,
    limit: int = 20,
    supervisor_type: SupervisorType | None = None,
) -> dict:
    """
    List all supervisors with pagination (Admin only).
    """
    skip = (page - 1) * limit

    supervisors, total = supervisor_repository.get_all_supervisors(
        skip=skip,
        limit=limit,
        supervisor_type=supervisor_type,
    )

    return {
        "supervisors": [
            {
                "id": s.id,
                "name": s.name or "",
                "supervisor_type": s.supervisor_type,
                "performance_score": s.performance_score,
                "total_interactions": s.total_interactions,
                "created_at": s.created_at,
                "updated_at": s.updated_at,
            }
            for s in supervisors
        ],
        "total": total,
        "page": page,
        "limit": limit,
    }


def get_supervisor_detail(
    supervisor_id: UUID,
    current_user_id: UUID,
    current_user_role: UserRole,
) -> dict:
    """
    Get detailed supervisor information.
    """
    # Authorization check
    if current_user_role != UserRole.ADMIN and current_user_id != supervisor_id:
        raise ForbiddenException("You do not have permission to view this supervisor")

    supervisor = supervisor_repository.get_by_id(supervisor_id)
    if supervisor is None:
        raise NotFoundException("Supervisor not found")

    # Reuse aggregation for consistent agent data view
    agents = supervisor_repository.get_dashboard_data(supervisor_id)
    recent_interactions = supervisor_repository.get_recent_interactions(
        supervisor_id, limit=10
    )

    return {
        "id": supervisor.id,
        "name": supervisor.name or "",
        "supervisor_type": supervisor.supervisor_type,
        "performance_score": supervisor.performance_score,
        "total_interactions": supervisor.total_interactions,
        "created_at": supervisor.created_at,
        "updated_at": supervisor.updated_at,
        "agents": agents,
        "recent_interactions": recent_interactions,
    }


# ==============================
# Supervisor CRUD (Sundus's service functions)
# ==============================


def create_supervisor(data: SupervisorCreate) -> dict:
    """
    Create a new supervisor with Supabase auth user.

    1. Creates an auth user in Supabase
    2. Creates a supervisor record linked to the auth user
    """
    supabase_admin = get_supabase_service_client()

    # Create auth user via Supabase Admin API
    try:
        auth_user = supabase_admin.auth.admin.create_user({
            "email": data.email,
            "password": data.password,
            "email_confirm": True,
        })
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An internal error occurred while creating the auth user.",
        )

    if not auth_user or not auth_user.user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to create auth user",
        )

    # Create supervisor record
    result = (
        supabase_admin.table("supervisors")
        .insert({
            "userID": str(auth_user.user.id),
            "supervisor_type": data.supervisor_type.value,
        })
        .execute()
    )

    row = result.data[0]
    row["id"] = row.get("userID", row.get("id"))
    row.setdefault("name", "")
    row.setdefault("total_interactions", 0)
    return row


def update_supervisor(supervisor_id: UUID, data: SupervisorUpdate) -> dict:
    """
    Update a supervisor's fields.
    """
    supabase = get_supabase_client()

    # Verify supervisor exists
    supervisor = supervisor_repository.get_by_id(supervisor_id)
    if supervisor is None:
        raise NotFoundException("Supervisor not found")

    payload = {k: v for k, v in data.model_dump(exclude_none=True).items()}
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields to update",
        )

    # Convert enum values to strings for Supabase
    if "supervisor_type" in payload:
        payload["supervisor_type"] = payload["supervisor_type"].value

    payload["updated_at"] = datetime.now(timezone.utc).isoformat()

    result = (
        supabase.table("supervisors")
        .update(payload)
        .eq("userID", str(supervisor_id))
        .execute()
    )

    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Update blocked by database policy",
        )

    row = result.data[0]
    row["id"] = row.get("userID", row.get("id"))
    row.setdefault("name", "")
    row.setdefault("total_interactions", 0)
    return row


def delete_supervisor(supervisor_id: UUID, deleted_by: str) -> dict:
    """
    Delete a supervisor with cascade (DANGEROUS).

    1. Check for active interactions
    2. Delete all interactions for supervisor's agents
    3. Delete all agents
    4. Delete supervisor record
    5. Delete auth user
    """
    supabase = get_supabase_client()

    # Verify supervisor exists
    supervisor = supervisor_repository.get_by_id(supervisor_id)
    if supervisor is None:
        raise NotFoundException("Supervisor not found")

    # Get supervisor's agents
    agents_result = (
        supabase.table("agents")
        .select("id")
        .eq("supervisor_id", str(supervisor_id))
        .execute()
    )
    agent_ids = [a["id"] for a in agents_result.data or []]

    # Check for active interactions
    if agent_ids:
        active_result = (
            supabase.table("interactions")
            .select("id")
            .in_("agent_id", agent_ids)
            .eq("status", "active")
            .execute()
        )
        if active_result.data:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Cannot delete supervisor with active calls/chats",
            )

    # Cascade delete: interactions → agents → supervisor
    if agent_ids:
        supabase.table("interactions").delete().in_("agent_id", agent_ids).execute()
        supabase.table("agents").delete().in_("id", agent_ids).execute()

    supabase.table("supervisors").delete().eq("userID", str(supervisor_id)).execute()

    # Delete auth user
    try:
        supabase_admin = get_supabase_service_client()
        supabase_admin.auth.admin.delete_user(str(supervisor_id))
    except Exception:
        pass  # Auth user deletion is best-effort

    return {"status": "deleted"}
