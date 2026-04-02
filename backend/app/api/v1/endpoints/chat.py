"""Chat session REST API endpoints."""

import json
import logging
from datetime import datetime, timezone
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse

from app.agents.agent_runner import AgentRunner
from app.api.deps import get_current_user
from app.api.v1.schemas.auth import UserResponse
from app.api.v1.schemas.chat import (
    ChatMessageResponse,
    SendMessageRequest,
    StartChatRequest,
    StartChatResponse,
    WhisperRequest,
)
from app.core.constants import AgentStatus, InteractionType, InteractionStatus
from app.db.supabase import get_supabase_client

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chat", tags=["Chat"])


# ─────────────────────────────────────────────
# POST /chat/sessions — Start a new chat session
# ─────────────────────────────────────────────
@router.post(
    "/sessions",
    response_model=StartChatResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Start a new chat session",
    description="Creates a new interaction, boots a ChatAgent, and returns the session ID.",
)
async def start_chat_session(
    request: StartChatRequest,
    current_user: Annotated[UserResponse, Depends(get_current_user)],
) -> StartChatResponse:
    """Start a new chat session with an AI agent."""
    db = get_supabase_client()

    # 1. Verify the agent exists and belongs to the current user (or is admin)
    agent_result = (
        db.table("agents")
        .select("id, supervisor_id, name, system_prompt, status, agent_type")
        .eq("id", str(request.agent_id))
        .limit(1)
        .execute()
    )

    if not agent_result.data:
        raise HTTPException(status_code=404, detail="Agent not found")

    agent = agent_result.data[0]

    # Authorization: supervisor can only use their own agents
    if current_user.role != "admin" and agent["supervisor_id"] != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized to use this agent")

    # 2. Check agent is available
    if agent["status"] != AgentStatus.IDLE.value:
        raise HTTPException(
            status_code=409,
            detail=f"Agent is currently {agent['status']}. Only idle agents can start a chat.",
        )

    # 3. Create the interaction record
    now = datetime.now(timezone.utc).isoformat()
    interaction_data = {
        "agent_id": str(request.agent_id),
        "interaction_type": InteractionType.CHAT.value,
        "status": InteractionStatus.ACTIVE.value,
        "started_at": now,
    }

    interaction_result = db.table("interactions").insert(interaction_data).execute()
    if not interaction_result.data:
        raise HTTPException(status_code=500, detail="Failed to create interaction record")

    interaction = interaction_result.data[0]
    interaction_id = UUID(interaction["id"])

    # 4. Update agent status to in_chat
    db.table("agents").update({
        "status": AgentStatus.IN_CHAT.value,
        "updated_at": now,
    }).eq("id", str(request.agent_id)).execute()

    # 5. Boot the ChatAgent in memory
    await AgentRunner.start_session(
        agent_id=request.agent_id,
        interaction_id=interaction_id,
        system_prompt=agent["system_prompt"],
        agent_name=agent["name"],
    )

    logger.info(f"Chat session started: {interaction_id} with agent {agent['name']}")

    return StartChatResponse(
        session_id=interaction_id,
        agent_id=request.agent_id,
        agent_name=agent["name"],
    )


# ─────────────────────────────────────────────
# POST /chat/sessions/{id}/messages — Send a message
# ─────────────────────────────────────────────
@router.post(
    "/sessions/{session_id}/messages",
    summary="Send a customer message",
    description="Sends a message to the AI agent and returns the response as an SSE stream.",
)
async def send_message(
    session_id: UUID,
    request: SendMessageRequest,
    current_user: Annotated[UserResponse, Depends(get_current_user)],
):
    """Send a customer message and stream the AI response via SSE."""
    # 1. Get the active session
    chat_agent = AgentRunner.get_session(session_id)
    if not chat_agent:
        raise HTTPException(status_code=404, detail="Chat session not found or has ended")

    db = get_supabase_client()

    # 2. Store the customer message
    customer_msg = {
        "interaction_id": str(session_id),
        "role": "customer",
        "content": request.content,
    }
    msg_result = db.table("chat_messages").insert(customer_msg).execute()
    customer_msg_data = msg_result.data[0] if msg_result.data else None

    # 3. Broadcast customer message to SSE subscribers
    await AgentRunner.broadcast_event(session_id, {
        "type": "message",
        "data": {
            "role": "customer",
            "content": request.content,
            "created_at": datetime.now(timezone.utc).isoformat(),
        },
    })

    # 4. Stream the AI response
    async def generate_sse():
        full_response = ""
        try:
            async for chunk in chat_agent.process_message(request.content):
                full_response += chunk
                # SSE format: data: ...\n\n
                sse_data = json.dumps({"type": "chunk", "content": chunk})
                yield f"data: {sse_data}\n\n"

            # Store the complete agent response
            agent_msg = {
                "interaction_id": str(session_id),
                "role": "agent",
                "content": full_response,
            }
            db.table("chat_messages").insert(agent_msg).execute()

            # Broadcast the complete agent message to SSE subscribers
            await AgentRunner.broadcast_event(session_id, {
                "type": "message",
                "data": {
                    "role": "agent",
                    "content": full_response,
                    "created_at": datetime.now(timezone.utc).isoformat(),
                },
            })

            # Send done event
            yield f"data: {json.dumps({'type': 'done'})}\n\n"

            # 5. Run sentiment analysis in background
            try:
                metrics = await chat_agent.analyze_sentiment()

                # Store metrics in realtime_metrics table
                metrics_data = {
                    "interaction_id": str(session_id),
                    "sentiment": metrics["sentiment"],
                    "satisfaction_score": metrics["satisfaction_score"],
                    "feed_text": metrics["feed_text"],
                }
                db.table("realtime_metrics").insert(metrics_data).execute()

                # Broadcast metrics to SSE subscribers
                await AgentRunner.broadcast_event(session_id, {
                    "type": "metrics",
                    "data": metrics,
                })

                # Send metrics to the customer SSE stream too
                yield f"data: {json.dumps({'type': 'metrics', **metrics})}\n\n"

            except Exception as e:
                logger.error(f"Sentiment analysis failed: {e}")

        except Exception as e:
            logger.error(f"Error streaming response: {e}")
            error_data = json.dumps({"type": "error", "content": "An error occurred"})
            yield f"data: {error_data}\n\n"

    return StreamingResponse(
        generate_sse(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


# ─────────────────────────────────────────────
# POST /chat/sessions/{id}/end — End a session
# ─────────────────────────────────────────────
@router.post(
    "/sessions/{session_id}/end",
    status_code=status.HTTP_200_OK,
    summary="End a chat session",
    description="Ends the chat session, updates the interaction status, and frees the agent.",
)
async def end_chat_session(
    session_id: UUID,
    current_user: Annotated[UserResponse, Depends(get_current_user)],
):
    """End an active chat session."""
    chat_agent = AgentRunner.get_session(session_id)
    if not chat_agent:
        raise HTTPException(status_code=404, detail="Chat session not found or already ended")

    db = get_supabase_client()
    now = datetime.now(timezone.utc).isoformat()

    # 1. Update interaction status
    db.table("interactions").update({
        "status": InteractionStatus.COMPLETED.value,
        "end_at": now,
    }).eq("id", str(session_id)).execute()

    # 2. Set agent back to idle
    db.table("agents").update({
        "status": AgentStatus.IDLE.value,
        "updated_at": now,
    }).eq("id", str(chat_agent.agent_id)).execute()

    # 3. End the in-memory session (notifies SSE subscribers)
    await AgentRunner.end_session(session_id)

    return {"status": "ended", "session_id": str(session_id)}


# ─────────────────────────────────────────────
# POST /chat/sessions/{id}/whisper — Supervisor inject
# ─────────────────────────────────────────────
@router.post(
    "/sessions/{session_id}/whisper",
    status_code=status.HTTP_200_OK,
    summary="Inject a supervisor instruction",
    description="Supervisor injects an instruction that the AI agent will incorporate into its next response.",
)
async def whisper_inject(
    session_id: UUID,
    request: WhisperRequest,
    current_user: Annotated[UserResponse, Depends(get_current_user)],
):
    """Inject a supervisor whisper instruction into active chat session."""
    chat_agent = AgentRunner.get_session(session_id)
    if not chat_agent:
        raise HTTPException(status_code=404, detail="Chat session not found or has ended")

    # Inject the whisper
    chat_agent.inject_whisper(request.content)

    db = get_supabase_client()

    # Store as a supervisor message
    db.table("chat_messages").insert({
        "interaction_id": str(session_id),
        "role": "supervisor",
        "content": request.content,
    }).execute()

    # Broadcast whisper event to SSE subscribers
    await AgentRunner.broadcast_event(session_id, {
        "type": "whisper",
        "data": {
            "content": request.content,
            "created_at": datetime.now(timezone.utc).isoformat(),
        },
    })

    return {"status": "injected", "session_id": str(session_id)}


# ─────────────────────────────────────────────
# GET /chat/sessions/{id}/messages — Get history
# ─────────────────────────────────────────────
@router.get(
    "/sessions/{session_id}/messages",
    response_model=list[ChatMessageResponse],
    summary="Get chat message history",
    description="Returns all messages in a chat session, ordered by creation time.",
)
async def get_messages(
    session_id: UUID,
    current_user: Annotated[UserResponse, Depends(get_current_user)],
) -> list[ChatMessageResponse]:
    """Get all messages for a chat session."""
    db = get_supabase_client()

    result = (
        db.table("chat_messages")
        .select("*")
        .eq("interaction_id", str(session_id))
        .order("created_at", desc=False)
        .execute()
    )

    return [ChatMessageResponse.model_validate(msg) for msg in result.data]


# ------------------------------------------
# GET /chat/sessions/active — List active sessions
# ------------------------------------------
@router.get(
    "/sessions/active",
    summary="List active chat sessions",
    description="Returns all currently active chat sessions for the supervisor's agents.",
)
async def list_active_sessions(
    current_user: Annotated[UserResponse, Depends(get_current_user)],
):
    """List all active chat sessions with agent info and metrics."""
    active_sessions = AgentRunner.get_active_sessions()

    if not active_sessions:
        return []

    db = get_supabase_client()

    # Get the supervisor's agent IDs for filtering
    if current_user.role == "admin":
        allowed_agent_ids = None  # Admin sees all
    else:
        agent_result = (
            db.table("agents")
            .select("id")
            .eq("supervisor_id", str(current_user.id))
            .execute()
        )
        allowed_agent_ids = {r["id"] for r in agent_result.data} if agent_result.data else set()

    result = []
    for interaction_id, chat_agent in active_sessions.items():
        # Filter: supervisor can only see their own agents' sessions
        if allowed_agent_ids is not None and str(chat_agent.agent_id) not in allowed_agent_ids:
            continue

        session_data = {
            "session_id": str(interaction_id),
            "agent_id": str(chat_agent.agent_id),
            "agent_name": chat_agent.agent_name,
            "is_active": chat_agent.is_active,
            "message_count": len(chat_agent.get_conversation_history()),
        }
        result.append(session_data)

    return result

