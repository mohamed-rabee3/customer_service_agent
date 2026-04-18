"""LiveKit room management."""

import json
import logging

from livekit import api

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


async def send_data_to_room(room_name: str, data: dict, topic: str) -> None:
    """
    Send a data message to all participants in a room.

    Args:
        room_name: Name of the room
        data: JSON-serializable data to send
        topic: Topic identifier (e.g., 'whisper')
    """
    try:
        lk = get_livekit_api()
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
