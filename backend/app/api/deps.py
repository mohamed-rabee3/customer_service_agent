"""Shared API dependencies."""

from app.api.v1.schemas.auth import UserResponse
from app.core.security import get_current_user

__all__ = ["get_current_user", "UserResponse"]

