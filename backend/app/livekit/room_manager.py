"""LiveKit room management."""

import json
import logging

from livekit import api
from livekit.protocol.room import ListRoomsRequest

from app.livekit.client import get_livekit_api

logger = logging.getLogger(__name__)


async def create_room(room_name: str, metadata: dict | None = None):
    """
    Create a new LiveKit room.

    Args:
        room_name: Unique name for the room
        metadata: Optional JSON-serializable metadata for the room

    Returns:
        Created Room object
    """
    lk = get_livekit_api()
    room = await lk.room.create_room(
        api.CreateRoomRequest(
            name=room_name,
            empty_timeout=300,  # 5 minutes empty timeout
            max_participants=3,  # Customer + Agent + possible supervisor monitor
            metadata=json.dumps(metadata) if metadata else None,
        )
    )
    logger.info(f"Created LiveKit room: {room_name}")
    return room


async def delete_room(room_name: str) -> None:
    """
    Delete a LiveKit room.

    Args:
        room_name: Name of the room to delete
    """
    try:
        lk = get_livekit_api()
        await lk.room.delete_room(
            api.DeleteRoomRequest(room=room_name)
        )
        logger.info(f"Deleted LiveKit room: {room_name}")
    except Exception as e:
        logger.warning(f"Failed to delete LiveKit room {room_name}: {e}")


def _parse_room_metadata(raw: str | None) -> dict:
    if not raw:
        return {}
    try:
        parsed = json.loads(raw)
        return parsed if isinstance(parsed, dict) else {}
    except json.JSONDecodeError:
        return {}


async def resolve_livekit_room_name(
    stored_room_name: str | None,
    *,
    agent_id: str | None = None,
    interaction_id: str | None = None,
) -> str | None:
    """
    Resolve the LiveKit room name for an active interaction.

    The DB call_source_id should match ctx.room.name, but if the room was
    re-created by dispatch or the stored name is stale, scan active rooms.
    """
    lk = get_livekit_api()
    names_to_try: list[str] = []
    if stored_room_name:
        names_to_try.append(stored_room_name)

    if names_to_try:
        try:
            listed = await lk.room.list_rooms(ListRoomsRequest(names=names_to_try))
            if listed.rooms:
                return listed.rooms[0].name
        except Exception as e:
            logger.warning("list_rooms by name failed: %s", e)

    try:
        all_rooms = await lk.room.list_rooms(ListRoomsRequest())
    except Exception as e:
        logger.warning("list_rooms failed: %s", e)
        return stored_room_name

    agent_id_str = str(agent_id) if agent_id else ""
    interaction_id_str = str(interaction_id) if interaction_id else ""

    for room in all_rooms.rooms:
        if stored_room_name and room.name == stored_room_name:
            return room.name
        meta = _parse_room_metadata(room.metadata)
        if agent_id_str and str(meta.get("agent_db_id", "")) == agent_id_str:
            logger.info(
                "Resolved LiveKit room %s for agent %s (metadata match)",
                room.name,
                agent_id_str,
            )
            return room.name
        if interaction_id_str and str(meta.get("interaction_id", "")) == interaction_id_str:
            logger.info(
                "Resolved LiveKit room %s for interaction %s (metadata match)",
                room.name,
                interaction_id_str,
            )
            return room.name

    return stored_room_name


async def send_data_to_room(room_name: str, data: dict, topic: str) -> None:
    """
    Send a data message to all participants in a room.

    Args:
        room_name: Name of the room
        data: JSON-serializable data to send
        topic: Topic identifier (e.g., 'whisper')
    """
    lk = get_livekit_api()
    try:
        await lk.room.send_data(
            api.SendDataRequest(
                room=room_name,
                data=json.dumps(data).encode("utf-8"),
                topic=topic,
            )
        )
        logger.info(f"Sent data to room {room_name} on topic '{topic}'")
    except Exception as e:
        logger.error(f"Failed to send data to room {room_name}: {e}")
        raise
