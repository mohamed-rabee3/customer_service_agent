"""Chat session lifecycle management.

# TODO: migrate to Redis Pub/Sub for SSE events and store active session
# context in a caching layer to survive FastAPI worker restarts / multi-worker
# deployments.  (See V3 code review — In-Memory State Loss Risks)
"""

import asyncio
import logging
from uuid import UUID

from app.agents.chat_agent import ChatAgent

logger = logging.getLogger(__name__)


class ChatSessionManager:
    """
    In-memory registry of active ChatAgent instances.
    
    Manages the lifecycle of chat sessions: creation, retrieval,
    and cleanup. Thread-safe via asyncio.Lock.
    
    This is a singleton-style class using class-level state so that
    any endpoint handler can access active sessions.
    """

    _sessions: dict[UUID, ChatAgent] = {}
    _lock = asyncio.Lock()

    # SSE subscriber queues per interaction_id
    # Each interaction can have multiple subscribers (supervisors)
    _subscribers: dict[UUID, list[asyncio.Queue]] = {}

    @classmethod
    async def start_session(
        cls,
        agent_id: UUID,
        interaction_id: UUID,
        system_prompt: str,
        agent_name: str = "Agent",
    ) -> ChatAgent:
        """
        Create and register a new ChatAgent session.
        
        Args:
            agent_id: UUID of the agent record.
            interaction_id: UUID of the interaction record.
            system_prompt: System instructions for the AI.
            agent_name: Display name of the agent.
            
        Returns:
            ChatAgent: The newly created agent instance.
        """
        async with cls._lock:
            chat_agent = ChatAgent(
                agent_id=agent_id,
                interaction_id=interaction_id,
                system_prompt=system_prompt,
                agent_name=agent_name,
            )
            cls._sessions[interaction_id] = chat_agent
            cls._subscribers[interaction_id] = []

            logger.info(
                f"Chat session started: interaction={interaction_id}, "
                f"agent={agent_id} ({agent_name})"
            )
            return chat_agent

    @classmethod
    def get_session(cls, interaction_id: UUID) -> ChatAgent | None:
        """
        Retrieve an active ChatAgent session.
        
        Args:
            interaction_id: UUID of the interaction.
            
        Returns:
            ChatAgent or None if no active session.
        """
        return cls._sessions.get(interaction_id)

    @classmethod
    async def end_session(cls, interaction_id: UUID) -> None:
        """
        End and remove a ChatAgent session.
        
        Notifies all SSE subscribers that the session has ended,
        then cleans up resources.
        
        Args:
            interaction_id: UUID of the interaction.
        """
        async with cls._lock:
            agent = cls._sessions.pop(interaction_id, None)
            if agent:
                agent.end_session()

            # Notify SSE subscribers that session ended
            await cls.broadcast_event(interaction_id, {
                "type": "status",
                "data": {"status": "ended"},
            })

            # Clean up subscriber queues
            subscribers = cls._subscribers.pop(interaction_id, [])
            for queue in subscribers:
                await queue.put(None)  # Signal to close the SSE stream

            logger.info(f"Chat session ended: interaction={interaction_id}")

    @classmethod
    async def broadcast_event(cls, interaction_id: UUID, event: dict) -> None:
        """
        Broadcast an event to all SSE subscribers of a session.
        
        Args:
            interaction_id: UUID of the interaction.
            event: Event dict with 'type' and 'data' keys.
        """
        subscribers = cls._subscribers.get(interaction_id, [])
        dead_queues = []

        for queue in subscribers:
            try:
                queue.put_nowait(event)
            except asyncio.QueueFull:
                dead_queues.append(queue)

        # Remove dead queues
        for q in dead_queues:
            try:
                subscribers.remove(q)
            except ValueError:
                pass

    @classmethod
    def subscribe(cls, interaction_id: UUID) -> asyncio.Queue | None:
        """
        Subscribe to SSE events for a chat session.
        
        Returns:
            asyncio.Queue to receive events from, or None if session not found.
        """
        if interaction_id not in cls._sessions:
            return None

        queue: asyncio.Queue = asyncio.Queue(maxsize=100)

        if interaction_id not in cls._subscribers:
            cls._subscribers[interaction_id] = []

        cls._subscribers[interaction_id].append(queue)
        logger.info(f"New SSE subscriber for interaction={interaction_id}")
        return queue

    @classmethod
    def unsubscribe(cls, interaction_id: UUID, queue: asyncio.Queue) -> None:
        """
        Remove an SSE subscriber.
        
        Args:
            interaction_id: UUID of the interaction.
            queue: The subscriber's queue to remove.
        """
        subscribers = cls._subscribers.get(interaction_id, [])
        try:
            subscribers.remove(queue)
        except ValueError:
            pass

    @classmethod
    def get_active_sessions(cls) -> dict[UUID, ChatAgent]:
        """Get all active chat sessions (for admin/debug)."""
        return dict(cls._sessions)
