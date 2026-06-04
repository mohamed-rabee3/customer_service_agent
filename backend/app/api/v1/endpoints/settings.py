"""Settings endpoints."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.api.deps import get_current_user
from app.api.v1.schemas.auth import UserResponse
from app.db.supabase import get_supabase_client

router = APIRouter(prefix="/settings", tags=["Settings"])


class SettingsUpdateRequest(BaseModel):
    settings: dict


@router.get("")
async def get_settings(
    current_user: Annotated[UserResponse, Depends(get_current_user)],
):
    """Get settings for the currently authenticated user."""
    client = get_supabase_client()
    try:
        response = (
            client.table("settings")
            .select("settings")
            .eq("user_id", str(current_user.id))
            .execute()
        )
        if response.data:
            return response.data[0]["settings"]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch settings: {str(e)}"
        )

    # Return default settings if none exists
    return {
        "companyName": "OmniServa AI",
        "tagline": "Agentic customer service system with human feedback",
        "supportEmail": "support@company.com",
        "logoPreview": None,
        "language": "en",
        "emailNotif": True,
        "pushNotif": False,
        "inAppNotif": True,
        "twoFactor": False,
        "sessionTimeout": 30,
        "aiBargeIn": True,
        "aiConfidence": 75,
        "voiceSpeed": 1.0,
        "maxConversations": 5,
        "autoAssign": True,
    }


@router.patch("")
async def update_settings(
    payload: SettingsUpdateRequest,
    current_user: Annotated[UserResponse, Depends(get_current_user)],
):
    """Upsert settings for the currently authenticated user."""
    client = get_supabase_client()
    try:
        # Fetch current settings to merge
        res = (
            client.table("settings")
            .select("settings")
            .eq("user_id", str(current_user.id))
            .execute()
        )
        current_settings = {}
        if res.data:
            current_settings = res.data[0]["settings"]

        new_settings = {**current_settings, **payload.settings}

        upsert_payload = {
            "user_id": str(current_user.id),
            "settings": new_settings,
        }

        client.table("settings").upsert(upsert_payload).execute()
        return new_settings
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to update settings: {str(e)}"
        )
