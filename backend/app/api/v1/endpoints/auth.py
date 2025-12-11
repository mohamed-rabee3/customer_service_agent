"""Authentication endpoints."""

from typing import Annotated

from fastapi import APIRouter, Depends

from app.api.deps import get_current_user
from app.api.v1.schemas.auth import UserResponse

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: Annotated[UserResponse, Depends(get_current_user)],
) -> UserResponse:
    """Get current authenticated user information."""
    return current_user
