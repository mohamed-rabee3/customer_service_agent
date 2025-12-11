"""Supabase client initialization with singleton pattern."""

from supabase import Client, create_client

from app.core.config import settings

# Singleton instance
_supabase_client: Client | None = None


def get_supabase_client() -> Client:
    """
    Get or create Supabase client instance (singleton pattern).

    Returns:
        Client: Configured Supabase client instance
    """
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

