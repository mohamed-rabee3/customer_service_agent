"""Security utilities for authentication and authorization."""

import asyncio
from datetime import datetime
from typing import Annotated, Any, Dict
from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.api.v1.schemas.auth import AdminProfile, SupervisorProfile, UserResponse
from app.core.constants import SupervisorType, UserRole
<<<<<<< HEAD
from app.db.supabase import get_supabase_client, get_supabase_service_client
=======
from app.db.supabase import get_supabase_client, run_supabase_request
>>>>>>> b09ce7ab6a868db1a2bb87739d2182549f135ae9

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


<<<<<<< HEAD
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

    # 1. Verify token validity via Supabase Auth
=======
def _resolve_current_user_sync(token: str) -> UserResponse:
    """Sync Supabase auth + role lookup (run via asyncio.to_thread from async routes)."""
>>>>>>> b09ce7ab6a868db1a2bb87739d2182549f135ae9
    try:
        auth_client = get_supabase_client()
        response = auth_client.auth.get_user(jwt=token)
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
    display_name = _extract_display_name(
        getattr(user_data, "user_metadata", None), user_data.email or ""
    )

    from app.db.supabase import request_jwt

    request_jwt.set(token)

<<<<<<< HEAD
    # 3. Resolve role via service client (avoids RLS blocking auth/me during login)
    supabase_admin = get_supabase_service_client()
=======
    supabase: Client = get_supabase_client()
>>>>>>> b09ce7ab6a868db1a2bb87739d2182549f135ae9

    admin_result = (
        supabase_admin.table("admin")
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

    supervisor_result = (
        supabase_admin.table("supervisors")
        .select("supervisor_type, created_at, name")
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
            name=supervisor_row.get("name") or display_name,
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
        detail="User role not found. Ask an admin to link your account in the system.",
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

    return await asyncio.to_thread(
        lambda: run_supabase_request(lambda: _resolve_current_user_sync(token))
    )
