"""Supabase client initialization with singleton pattern."""

from contextvars import ContextVar
from supabase import Client, create_client

from app.core.config import settings

# Singleton instance for public operations
_supabase_client: Client | None = None

# Context variable to securely hold the current request's JWT token
request_jwt: ContextVar[str | None] = ContextVar("request_jwt", default=None)


def get_supabase_client() -> Client:
    """
    Get Supabase client instance.
    If a JWT context is active, returns a fresh client scoped to the request
    to prevent cross-contamination in concurrent executing async endpoints.
    """
    token = request_jwt.get()
    
    if token:
        # Create a fresh client authenticated exactly to this user
        client = create_client(settings.supabase_url, settings.supabase_key)
        client.postgrest.auth(token)
        return client

    global _supabase_client

    if _supabase_client is None:
        _supabase_client = create_client(
            settings.supabase_url,
            settings.supabase_key,
        )

    return _supabase_client


def get_supabase_service_client() -> Client:
    """
    Get Supabase client with service role key (for admin operations).

    Returns:
        Client: Supabase client with service role permissions
    """
    return create_client(
        settings.supabase_url,
        settings.supabase_service_key,
    )

