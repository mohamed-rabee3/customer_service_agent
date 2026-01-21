"""Security utilities for authentication and authorization."""

from datetime import datetime
from typing import Annotated, Any, Dict
from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from supabase import Client

from app.api.v1.schemas.auth import AdminProfile, SupervisorProfile, UserResponse
from app.core.constants import SupervisorType, UserRole
from app.db.supabase import get_supabase_client

# HTTP Bearer token scheme (manual error handling for 401 responses)
security = HTTPBearer(auto_error=False)


def _parse_datetime(value: Any) -> datetime | None:
    """Parse ISO timestamps returned by Supabase/Postgres."""
    if value is None:
        return None
    if isinstance(value, datetime):
        return value
    if isinstance(value, str):
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    return None


def _extract_display_name(user_metadata: Dict[str, Any] | None, fallback: str) -> str:
    """Derive a display name from user metadata with safe fallbacks."""
    metadata = user_metadata or {}
    return (
        metadata.get("name")
        or metadata.get("full_name")
        or metadata.get("display_name")
        or metadata.get("displayName")
        or fallback
    )


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(security)],
) -> UserResponse:
    """
    Validate JWT token via Supabase and return the current user with role/profile.
    """
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization header",
        )

    token = credentials.credentials
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication token",
        )

    supabase: Client = get_supabase_client()

    try:
        response = supabase.auth.get_user(token)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token",
        )

    if not response or not response.user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
        )

    user_data = response.user
    user_id_str = str(user_data.id)
    user_uuid = UUID(user_id_str)
    display_name = _extract_display_name(getattr(user_data, "user_metadata", None), user_data.email or "")

    # Set user's JWT for RLS enforcement on subsequent queries
    supabase.postgrest.auth(token)

    # Check admin role (RLS: admin can see their own row)
    admin_result = (
        supabase.table("admin")
        .select("created_at")
        .eq("userID", user_id_str)
        .limit(1)
        .execute()
    )
    if admin_result.data:
        admin_row = admin_result.data[0]
        profile = AdminProfile(
            name=display_name,
            created_at=_parse_datetime(admin_row.get("created_at")),
        )
        return UserResponse(
            id=user_uuid,
            email=user_data.email or "",
            role=UserRole.ADMIN,
            profile=profile,
        )

    # Check supervisor role (RLS: supervisor can see their own row)
    supervisor_result = (
        supabase.table("supervisors")
        .select("supervisor_type, created_at")
        .eq("userID", user_id_str)
        .limit(1)
        .execute()
    )
    if supervisor_result.data:
        supervisor_row = supervisor_result.data[0]
        supervisor_type = supervisor_row.get("supervisor_type")
        try:
            supervisor_enum = SupervisorType(supervisor_type)
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid supervisor role",
            )

        profile = SupervisorProfile(
            name=display_name,
            supervisor_type=supervisor_enum,
            created_at=_parse_datetime(supervisor_row.get("created_at")),
        )
        return UserResponse(
            id=user_uuid,
            email=user_data.email or "",
            role=UserRole.SUPERVISOR,
            profile=profile,
        )

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="User role not found",
    )
