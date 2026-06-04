"""Supervisor service - Business logic layer for supervisor operations."""

from datetime import datetime, timezone
from uuid import UUID

from fastapi import HTTPException, status

from app.api.v1.schemas.supervisor import SupervisorCreate, SupervisorUpdate
from app.core.constants import SupervisorType, UserRole
from app.core.exceptions import ForbiddenException, NotFoundException
from app.core.auth_emails import (
    get_auth_profiles_for_user_ids,
    get_display_name_for_user_id,
    get_email_for_user_id,
    get_emails_for_user_ids,
)
from app.db.supabase import get_supabase_service_client, run_supabase_request
from app.repositories.supervisor_repository import SupervisorModel, supervisor_repository


def get_supervisor_dashboard(supervisor_id: UUID) -> dict:
    """
    Get dashboard data for a supervisor.
    """

    def _load() -> dict:
        supervisor = supervisor_repository.get_by_id(supervisor_id)
        if supervisor is None:
            raise NotFoundException("Supervisor not found")

        supervisor_repository.touch_monitoring_presence(supervisor_id)
        enriched_agents = supervisor_repository.get_dashboard_data(supervisor_id)

        return {
            "agents": enriched_agents,
            "total": len(enriched_agents),
        }

    return run_supabase_request(_load)


def list_supervisors(
    page: int = 1,
    limit: int = 20,
    supervisor_type: SupervisorType | None = None,
    search: str | None = None,
) -> dict:
    """
    List all supervisors with pagination (Admin only).
    """
    if search:
        supervisors, _ = supervisor_repository.get_all_supervisors(
            skip=0,
            limit=1000000,
            supervisor_type=supervisor_type,
        )
    else:
        skip = (page - 1) * limit
        supervisors, total = supervisor_repository.get_all_supervisors(
            skip=skip,
            limit=limit,
            supervisor_type=supervisor_type,
        )

    supervisor_ids = [s.id for s in supervisors]
    email_map = get_emails_for_user_ids(supervisor_ids)
    profile_map = get_auth_profiles_for_user_ids(supervisor_ids)

    # Batch count agents per supervisor for fast team-overview rendering.
    agent_count_map: dict[str, int] = {}
    if supervisor_ids:
        supabase_admin = get_supabase_service_client()
        agent_rows = (
            supabase_admin.table("agents")
            .select("supervisor_id")
            .in_("supervisor_id", [str(sid) for sid in supervisor_ids])
            .execute()
        ).data or []
        for row in agent_rows:
            sid = str(row.get("supervisor_id", ""))
            if not sid:
                continue
            agent_count_map[sid] = agent_count_map.get(sid, 0) + 1

    all_details = [
        {
            "id": s.id,
            "email": email_map.get(str(s.id)) or profile_map.get(str(s.id), {}).get("email") or "",
            "name": s.name or profile_map.get(str(s.id), {}).get("name") or "",
            "supervisor_type": s.supervisor_type,
            "agent_count": agent_count_map.get(str(s.id), 0),
            "performance_score": s.performance_score,
            "total_interactions": s.total_interactions,
            "created_at": s.created_at,
            "updated_at": s.updated_at,
        }
        for s in supervisors
    ]

    if search:
        search_lower = search.lower()
        filtered_details = [
            item for item in all_details
            if search_lower in item["name"].lower() or search_lower in item["email"].lower()
        ]
        total = len(filtered_details)
        skip = (page - 1) * limit
        paginated_details = filtered_details[skip : skip + limit]
    else:
        paginated_details = all_details

    return {
        "supervisors": paginated_details,
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
        "email": get_email_for_user_id(supervisor.id) or "",
        "name": supervisor.name or get_display_name_for_user_id(supervisor.id) or "",
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
        user_attributes = {
            "email": data.email,
            "password": data.password,
            "email_confirm": True,
        }
        if data.name:
            user_attributes["user_metadata"] = {"name": data.name}
            
        auth_user = supabase_admin.auth.admin.create_user(user_attributes)
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
    row["email"] = data.email
    row.setdefault("name", "")
    row.setdefault("total_interactions", 0)
    return row


def update_supervisor(supervisor_id: UUID, data: SupervisorUpdate) -> dict:
    """
    Update a supervisor's fields.
    """
    supabase_admin = get_supabase_service_client()

    supervisor = supervisor_repository.get_by_id(supervisor_id)
    if supervisor is None:
        raise NotFoundException("Supervisor not found")

    payload = data.model_dump(exclude_none=True, mode="json")
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields to update",
        )

    email_update = payload.pop("email", None)
    name_update = payload.pop("name", None)
    supervisor_type_update = payload.pop("supervisor_type", None)

    # Treat empty email updates as "no change"
    if email_update is not None and str(email_update).strip() == "":
        email_update = None

    # Sync auth user profile (name + email live in Supabase Auth)
    auth_updates: dict = {}
    if name_update is not None:
        try:
            existing_user = supabase_admin.auth.admin.get_user_by_id(str(supervisor_id))
            existing_meta = getattr(existing_user.user, "user_metadata", None) or {}
            auth_updates["user_metadata"] = {**existing_meta, "name": name_update}
        except Exception:
            auth_updates["user_metadata"] = {"name": name_update}

    if email_update is not None:
        auth_updates["email"] = email_update
        auth_updates["email_confirm"] = True

    if auth_updates:
        try:
            supabase_admin.auth.admin.update_user_by_id(str(supervisor_id), auth_updates)
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to update auth user: {exc}",
            ) from exc

    # Persistable fields in the supervisors table.
    # Display name is derived from Supabase auth metadata, so we only update DB fields we know exist.
    db_updates: dict = {"updated_at": datetime.now(timezone.utc).isoformat()}
    if supervisor_type_update is not None:
        db_updates["supervisor_type"] = supervisor_type_update

    # Allow optional analytics fields if explicitly provided
    for optional_field in ("performance_score", "total_interactions"):
        if optional_field in payload:
            db_updates[optional_field] = payload[optional_field]

    if len(db_updates) == 1:
        # Only updated_at — auth-only change is still valid
        pass

    result = (
        supabase_admin.table("supervisors")
        .update(db_updates)
        .eq("userID", str(supervisor_id))
        .execute()
    )

    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Supervisor not found or update failed",
        )

    row = result.data[0]
    row["id"] = row.get("userID", row.get("id"))
    row["email"] = email_update or get_email_for_user_id(supervisor_id) or ""
    row["name"] = (
        name_update
        or row.get("name")
        or get_display_name_for_user_id(supervisor_id)
        or supervisor.name
        or ""
    )
    row.setdefault("total_interactions", supervisor.total_interactions or 0)
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
    supabase_admin = get_supabase_service_client()

    # Verify supervisor exists
    supervisor = supervisor_repository.get_by_id(supervisor_id)
    if supervisor is None:
        raise NotFoundException("Supervisor not found")

    # Get supervisor's agents
    agents_result = (
        supabase_admin.table("agents")
        .select("id")
        .eq("supervisor_id", str(supervisor_id))
        .execute()
    )
    agent_ids = [a["id"] for a in agents_result.data or []]

    # Check for active interactions
    if agent_ids:
        active_result = (
            supabase_admin.table("interactions")
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
        supabase_admin.table("interactions").delete().in_("agent_id", agent_ids).execute()
        supabase_admin.table("agents").delete().in_("id", agent_ids).execute()

    supabase_admin.table("supervisors").delete().eq("userID", str(supervisor_id)).execute()

    # Delete auth user
    try:
        supabase_admin.auth.admin.delete_user(str(supervisor_id))
    except Exception:
        pass  # Auth user deletion is best-effort

    return {"status": "deleted"}
