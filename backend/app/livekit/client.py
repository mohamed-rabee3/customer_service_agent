"""LiveKit API client singleton."""

from livekit import api

from app.core.config import settings

# Singleton instance
_livekit_api: api.LiveKitAPI | None = None


def get_livekit_api() -> api.LiveKitAPI:
    """Get or create LiveKit API client instance (singleton)."""
    global _livekit_api

    if _livekit_api is None:
        _livekit_api = api.LiveKitAPI(
            url=settings.livekit_url,
            api_key=settings.livekit_api_key,
            api_secret=settings.livekit_api_secret,
        )

    return _livekit_api
