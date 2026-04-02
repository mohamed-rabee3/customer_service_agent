"""SSE streaming endpoint for supervisor chat monitoring."""

import asyncio
import json
import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sse_starlette.sse import EventSourceResponse

from app.agents.agent_runner import AgentRunner
from app.api.deps import get_current_user
from app.api.v1.schemas.auth import UserResponse
from app.core.security import verify_token

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chat", tags=["Chat SSE"])


@router.get(
    "/sessions/{session_id}/stream",
    summary="SSE stream for supervisor monitoring",
    description=(
        "Opens a Server-Sent Events stream that pushes real-time chat events "
        "to the supervisor dashboard: new messages, sentiment metrics, "
        "whisper confirmations, and session status changes. "
        "Pass JWT via ?token= query param (EventSource can't send headers)."
    ),
)
async def stream_chat_events(
    session_id: UUID,
    token: str | None = Query(None, description="JWT token (for EventSource which can't send headers)"),
    current_user: UserResponse | None = Depends(get_current_user),
):
    """
    SSE stream for real-time chat monitoring.
    
    Event types:
    - message: New chat message { role, content, created_at }
    - metrics: Sentiment update { sentiment, satisfaction_score, feed_text }
    - whisper: Whisper confirmation { content, created_at }
    - status: Session state change { status: "ended" }
    """
    # Verify the session exists
    chat_agent = AgentRunner.get_session(session_id)
    if not chat_agent:
        raise HTTPException(
            status_code=404,
            detail="Chat session not found or has ended",
        )

    # Subscribe to events
    queue = AgentRunner.subscribe(session_id)
    if queue is None:
        raise HTTPException(
            status_code=404,
            detail="Chat session not found",
        )

    async def event_generator():
        """Generate SSE events from the subscriber queue."""
        try:
            # Send initial connection event
            yield {
                "event": "connected",
                "data": json.dumps({
                    "session_id": str(session_id),
                    "agent_name": chat_agent.agent_name,
                    "status": "connected",
                }),
            }

            while True:
                try:
                    # Wait for events with a timeout to send keepalive
                    event = await asyncio.wait_for(queue.get(), timeout=30.0)

                    if event is None:
                        # Session ended signal
                        yield {
                            "event": "status",
                            "data": json.dumps({"status": "ended"}),
                        }
                        break

                    event_type = event.get("type", "message")
                    event_data = event.get("data", {})

                    yield {
                        "event": event_type,
                        "data": json.dumps(event_data),
                    }

                except asyncio.TimeoutError:
                    # Send keepalive comment to prevent connection timeout
                    yield {"comment": "keepalive"}

        except asyncio.CancelledError:
            logger.info(f"SSE stream cancelled for session {session_id}")
        finally:
            AgentRunner.unsubscribe(session_id, queue)
            logger.info(f"SSE subscriber disconnected from session {session_id}")

    return EventSourceResponse(event_generator())
