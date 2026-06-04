"""Authentication endpoints."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import get_current_user
from app.api.v1.schemas.auth import UserResponse, ProfileUpdateRequest, ChangePasswordRequest
from app.db.supabase import get_supabase_client, get_supabase_service_client
from app.core.security import resolve_user_from_jwt

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: Annotated[UserResponse, Depends(get_current_user)],
) -> UserResponse:
    """Get current authenticated user information."""
    return current_user


@router.patch("/profile", response_model=UserResponse)
async def update_profile(
    payload: ProfileUpdateRequest,
    current_user: Annotated[UserResponse, Depends(get_current_user)],
) -> UserResponse:
    """Update current user's profile metadata (name, email, avatar)."""
    supabase_admin = get_supabase_service_client()
    
    try:
        user_data = supabase_admin.auth.admin.get_user_by_id(str(current_user.id))
        existing_meta = getattr(user_data.user, "user_metadata", None) or {}
    except Exception:
        existing_meta = {}

    auth_updates: dict = {}
    user_metadata = {**existing_meta}

    if payload.name is not None:
        user_metadata["name"] = payload.name
    if payload.avatar_url is not None:
        user_metadata["avatar_url"] = payload.avatar_url

    if user_metadata:
        auth_updates["user_metadata"] = user_metadata

    if payload.email is not None and payload.email != current_user.email:
        auth_updates["email"] = payload.email
        auth_updates["email_confirm"] = True

    if auth_updates:
        try:
            supabase_admin.auth.admin.update_user_by_id(str(current_user.id), auth_updates)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to update auth user profile: {str(e)}"
            )

    from app.db.supabase import request_jwt
    token = request_jwt.get()
    if token:
        return await resolve_user_from_jwt(token)
    raise HTTPException(status_code=500, detail="JWT token not found in request context")


@router.patch("/change-password")
async def change_password(
    payload: ChangePasswordRequest,
    current_user: Annotated[UserResponse, Depends(get_current_user)],
):
    """Change password for current user after verifying current password."""
    anon_client = get_supabase_client()
    
    try:
        anon_client.auth.sign_in_with_password({
            "email": str(current_user.email),
            "password": payload.current_password
        })
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect."
        )

    supabase_admin = get_supabase_service_client()
    try:
        supabase_admin.auth.admin.update_user_by_id(
            str(current_user.id),
            {"password": payload.new_password}
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to update password: {str(e)}"
        )

    return {"message": "Password changed successfully"}

