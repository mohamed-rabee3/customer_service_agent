"""Resolve Supabase Auth profile fields for application user IDs."""

from typing import Any
from uuid import UUID

from app.db.supabase import get_supabase_service_client


def _iter_auth_users() -> list[Any]:
    try:
        supabase_admin = get_supabase_service_client()
        response = supabase_admin.auth.admin.list_users()
        if isinstance(response, list):
            return response
        return getattr(response, "users", []) or []
    except Exception:
        return []


def get_auth_profiles_for_user_ids(user_ids: list[UUID]) -> dict[str, dict[str, str]]:
    """Return user ID -> {email, name} from Supabase Auth."""
    if not user_ids:
        return {}

    wanted = {str(uid) for uid in user_ids}
    profiles: dict[str, dict[str, str]] = {}

    for user in _iter_auth_users():
        uid = str(getattr(user, "id", ""))
        if uid not in wanted:
            continue

        email = getattr(user, "email", None) or ""
        metadata = getattr(user, "user_metadata", None) or {}
        name = (
            metadata.get("name")
            or metadata.get("full_name")
            or metadata.get("display_name")
            or metadata.get("displayName")
            or ""
        )
        profiles[uid] = {"email": email, "name": str(name) if name else ""}

    return profiles


def get_emails_for_user_ids(user_ids: list[UUID]) -> dict[str, str]:
    """Return a map of user ID string -> email from Supabase Auth."""
    profiles = get_auth_profiles_for_user_ids(user_ids)
    return {
        uid: profile["email"]
        for uid, profile in profiles.items()
        if profile.get("email")
    }


def get_email_for_user_id(user_id: UUID) -> str | None:
    """Return email for a single auth user, or None if unavailable."""
    return get_emails_for_user_ids([user_id]).get(str(user_id))


def get_display_name_for_user_id(user_id: UUID) -> str | None:
    """Return display name from auth metadata, if available."""
    profile = get_auth_profiles_for_user_ids([user_id]).get(str(user_id))
    if not profile:
        return None
    name = profile.get("name", "").strip()
    return name or None
