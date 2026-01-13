"""Shared API dependencies."""

from fastapi import HTTPException, status, Depends
from app.api.v1.schemas.auth import UserResponse
from app.core.security import get_current_user
from app.core.constants import UserRole

async def require_admin(current_user: UserResponse = Depends(get_current_user)) -> UserResponse:
    """Dependency to ensure the current user is an admin."""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user

__all__ = ["get_current_user", "require_admin", "UserResponse"]

