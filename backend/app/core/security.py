"""Security utilities for authentication and authorization."""

import asyncio
from datetime import datetime
from typing import Annotated, Any, Dict
from uuid import UUID

from fastapi import Depends, HTTPException, Query, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.api.v1.schemas.auth import AdminProfile, SupervisorProfile, UserResponse
from app.core.constants import SupervisorType, UserRole
from app.db.supabase import (
    get_supabase_client,
    get_supabase_service_client,
    run_supabase_request,
)

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


def _resolve_current_user_sync(token: str) -> UserResponse:
    """Sync Supabase auth + role lookup (run via asyncio.to_thread from async routes)."""
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
    user_metadata = getattr(user_data, "user_metadata", None) or {}
    display_name = _extract_display_name(
        user_metadata, user_data.email or ""
    )
    avatar_url = user_metadata.get("avatar_url") or user_metadata.get("avatarUrl")

    from app.db.supabase import request_jwt

    request_jwt.set(token)

    # Service client avoids RLS blocking auth/me during login
    supabase_admin = get_supabase_service_client()

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
            avatar_url=avatar_url,
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
            avatar_url=avatar_url,
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

    user = await asyncio.to_thread(
        lambda: run_supabase_request(lambda: _resolve_current_user_sync(token))
    )
    # Auth runs in a thread pool; ContextVar changes there do not propagate back.
    # Set JWT on the request task so get_supabase_client() uses the user token + RLS.
    from app.db.supabase import request_jwt

    request_jwt.set(token)
    return user


async def resolve_user_from_jwt(token: str) -> UserResponse:
    """Validate a raw JWT (used by SSE ?token= and Authorization header)."""
    if not token or not token.strip():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication token",
        )
    jwt = token.strip()
    user = await asyncio.to_thread(
        lambda: run_supabase_request(lambda: _resolve_current_user_sync(jwt))
    )
    from app.db.supabase import request_jwt

    request_jwt.set(jwt)
    return user


async def get_current_user_flexible(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(security)],
    token: Annotated[str | None, Query(alias="token")] = None,
) -> UserResponse:
    """Bearer header or ?token= query (EventSource cannot send headers)."""
    jwt: str | None = None
    if credentials is not None and credentials.scheme.lower() == "bearer":
        jwt = credentials.credentials
    elif token:
        jwt = token
    if not jwt:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication token",
        )
    return await resolve_user_from_jwt(jwt)
