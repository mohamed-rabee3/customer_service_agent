"""LiveKit JWT token generation service."""

from datetime import timedelta

from livekit import api

from app.core.config import settings


def generate_customer_token(room_name: str, participant_identity: str) -> str:
    """
    Generate LiveKit access token for a customer joining a room.

    Args:
        room_name: Name of the LiveKit room
        participant_identity: Unique identity for the customer participant

    Returns:
        JWT token string for the customer
    """
    token = api.AccessToken(
        api_key=settings.livekit_api_key,
        api_secret=settings.livekit_api_secret,
    )
    token.with_identity(participant_identity)
    token.with_name(f"Customer-{participant_identity[:8]}")
    token.with_grants(
        api.VideoGrants(
            room_join=True,
            room=room_name,
            can_publish=True,
            can_subscribe=True,
        )
    )
    token.with_ttl(timedelta(hours=1))
    return token.to_jwt()


def generate_agent_token(room_name: str, agent_identity: str) -> str:
    """
    Generate LiveKit access token for an agent joining a room.

    Args:
        room_name: Name of the LiveKit room
        agent_identity: Unique identity for the agent participant

    Returns:
        JWT token string for the agent
    """
    token = api.AccessToken(
        api_key=settings.livekit_api_key,
        api_secret=settings.livekit_api_secret,
    )
    token.with_identity(agent_identity)
    token.with_name(f"Agent-{agent_identity[:8]}")
    token.with_grants(
        api.VideoGrants(
            room_join=True,
            room=room_name,
            can_publish=True,
            can_subscribe=True,
            room_admin=True,
        )
    )
    token.with_ttl(timedelta(hours=1))
    return token.to_jwt()


def generate_supervisor_token(room_name: str, supervisor_identity: str) -> str:
    """
    Generate LiveKit access token for a supervisor monitoring/barging into a room.

    Args:
        room_name: Name of the LiveKit room
        supervisor_identity: Unique identity for the supervisor participant

    Returns:
        JWT token string for the supervisor
    """
    token = api.AccessToken(
        api_key=settings.livekit_api_key,
        api_secret=settings.livekit_api_secret,
    )
    token.with_identity(supervisor_identity)
    token.with_name(f"Supervisor-{supervisor_identity[:8]}")
    token.with_grants(
        api.VideoGrants(
            room_join=True,
            room=room_name,
            can_publish=True,
            can_subscribe=True,
        )
    )
    token.with_ttl(timedelta(hours=1))
    return token.to_jwt()

