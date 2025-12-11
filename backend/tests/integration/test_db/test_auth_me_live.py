"""Integration check: Supabase sign-in and backend /auth/me."""

from __future__ import annotations

import os
import sys
from typing import Dict, Tuple

import pytest
import requests
from supabase import Client, create_client

# Add backend directory to path and change working directory
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
sys.path.insert(0, backend_dir)
os.chdir(backend_dir)  # Change to backend directory to find .env file

from app.core.config import settings

# Credentials provided for testing
# NOTE: Set these via environment variables in your test environment
# TEST_USER_EMAIL and TEST_USER_PASSWORD
TEST_USERS = [
    os.environ.get("TEST_USER_EMAIL_1", "test_user_1@example.com"),
    os.environ.get("TEST_USER_EMAIL_2", "test_user_2@example.com"),
]
TEST_PASSWORD = os.environ.get("TEST_USER_PASSWORD", "CHANGE_ME_IN_ENV")


def _get_supabase_client() -> Client:
    """Get Supabase client using settings from app.core.config."""
    return create_client(settings.supabase_url, settings.supabase_key)


def _auth_sign_in(client: Client, email: str, password: str) -> Tuple[str, Dict]:
    """Sign in with password, return access_token and user info."""
    resp = client.auth.sign_in_with_password(
        {"email": email, "password": password}
    )
    if not resp or not resp.session or not resp.session.access_token:
        raise RuntimeError(f"Failed to sign in user {email}")
    return resp.session.access_token, resp.user.model_dump() if resp.user else {}


def _call_auth_me(base_url: str, token: str) -> requests.Response:
    return requests.get(
        f"{base_url}/auth/me",
        headers={"Authorization": f"Bearer {token}"},
        timeout=15,
    )


@pytest.mark.parametrize("email", TEST_USERS)
def test_sign_in_and_auth_me(email: str):
    """
    - sign in with Supabase password auth (anon key)
    - ensure JWT issued
    - call backend /auth/me and verify role/profile present
    """
    # Skip if test credentials are not configured
    if TEST_PASSWORD == "CHANGE_ME_IN_ENV" or email == "test_user_1@example.com" or email == "test_user_2@example.com":
        pytest.skip("Test credentials not configured. Set TEST_USER_EMAIL_1, TEST_USER_EMAIL_2, and TEST_USER_PASSWORD environment variables.")
    
    base_url = os.environ.get("BACKEND_BASE_URL", "http://localhost:8000")
    client = _get_supabase_client()

    try:
        token, user_info = _auth_sign_in(client, email, TEST_PASSWORD)
        assert token, "No access token returned"

        # basic sanity on Supabase user payload
        assert user_info.get("id"), "Supabase user id missing"
        assert user_info.get("email") == email, "Supabase user email mismatch"

        resp = _call_auth_me(base_url, token)
        assert resp.status_code == 200, f"/auth/me failed: {resp.status_code} {resp.text}"
        payload = resp.json()

        # Expect role and profile per OpenAPI schema
        assert payload.get("role") in ("admin", "supervisor"), "Unexpected role"
        assert payload.get("profile"), "Profile missing"
    except Exception as e:
        if "Invalid login credentials" in str(e):
            pytest.skip(f"Test user {email} does not exist or credentials are invalid")
        raise


def test_missing_token_rejected():
    """Ensure /auth/me rejects missing Authorization header."""
    base_url = os.environ.get("BACKEND_BASE_URL", "http://localhost:8000")
    try:
        resp = requests.get(f"{base_url}/auth/me", timeout=5)
        assert resp.status_code == 401
    except requests.exceptions.ConnectionError:
        pytest.skip("Backend server is not running. Start server to test this endpoint.")

