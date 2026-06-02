"""Chat session REST API endpoints."""

import json
import logging
from datetime import datetime, timezone
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse

from app.agents.base_agent import archive_chat_interaction
from app.agents.chat_live_metrics import ChatLiveMetricsTracker
from app.agents.chat_session_manager import (
    ChatSessionManager,
    apply_chat_whisper,
    ensure_chat_session,
)
from app.api.deps import get_current_user
from app.api.v1.schemas.auth import UserResponse
from app.api.v1.schemas.chat import (
    ChatMessageResponse,
    SendMessageRequest,
    StartChatRequest,
    StartChatResponse,
    WhisperRequest,
)
from app.core.constants import AgentStatus, InteractionType, InteractionStatus, UserRole
from app.db.supabase import get_supabase_client, get_supabase_service_client

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chat", tags=["Chat"])


def _verify_chat_session_access(session_id: UUID, current_user: UserResponse) -> None:
    """Ensure the user may read this interaction (service client bypasses RLS)."""
    db = get_supabase_service_client()
    interaction = (
        db.table("interactions")
        .select("id, agent_id")
        .eq("id", str(session_id))
        .limit(1)
        .execute()
    )
    if not interaction.data:
        raise HTTPException(status_code=404, detail="Chat session not found")

    if current_user.role == UserRole.ADMIN:
        return

    agent = (
        db.table("agents")
        .select("supervisor_id")
        .eq("id", interaction.data[0]["agent_id"])
        .limit(1)
        .execute()
    )
    if not agent.data or str(agent.data[0]["supervisor_id"]) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized to view this session")


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
    await ChatSessionManager.start_session(
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
    chat_agent = ChatSessionManager.get_session(session_id)
    if not chat_agent:
        raise HTTPException(status_code=404, detail="Chat session not found or has ended")

    await ChatSessionManager.record_activity(session_id)

    db = get_supabase_client()

    # 2. Store the customer message
    customer_msg = {
        "interaction_id": str(session_id),
        "role": "customer",
        "content": request.content,
    }
    msg_result = db.table("chat_messages").insert(customer_msg).execute()
    customer_msg_data = msg_result.data[0] if msg_result.data else None
    ChatLiveMetricsTracker.append_line(session_id, "Customer", request.content)

    # 3. Broadcast customer message to SSE subscribers
    await ChatSessionManager.broadcast_event(session_id, {
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
            await ChatSessionManager.broadcast_event(session_id, {
                "type": "message",
                "data": {
                    "role": "agent",
                    "content": full_response,
                    "created_at": datetime.now(timezone.utc).isoformat(),
                },
            })

            # Send done event
            yield f"data: {json.dumps({'type': 'done'})}\n\n"

            ChatLiveMetricsTracker.append_line(session_id, "Agent", full_response)

        except Exception as e:
            logger.error(f"Error streaming response: {e}")
            error_data = json.dumps({"type": "error", "content": "An error occurred"})
            yield f"data: {error_data}\n\n"
        finally:
            await ChatSessionManager.record_activity(session_id)

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
    chat_agent = ChatSessionManager.get_session(session_id)
    if not chat_agent:
        raise HTTPException(status_code=404, detail="Chat session not found or already ended")

    db = get_supabase_client()
    now = datetime.now(timezone.utc).isoformat()

    # Capture transcript before tearing the in-memory session down
    history = chat_agent.get_conversation_history()
    transcript_lines: list[str] = []
    for msg in history:
        role = msg.get("role", "")
        content = (msg.get("content") or "").strip()
        if not content:
            continue
        if role == "user":
            transcript_lines.append(f"Customer: {content}")
        elif role == "assistant":
            transcript_lines.append(f"Agent: {content}")
        elif role == "supervisor":
            transcript_lines.append(f"Supervisor: {content}")
    joined_transcript = "\n".join(transcript_lines)
    has_agent_reply = any(line.startswith("Agent:") for line in transcript_lines)
    is_abandoned = len(transcript_lines) == 0 or not has_agent_reply
    final_status = (
        InteractionStatus.ABANDONED.value
        if is_abandoned
        else InteractionStatus.COMPLETED.value
    )

    # 1. Update interaction status (always run, even for abandoned chats)
    db.table("interactions").update({
        "status": final_status,
        "end_at": now,
        "is_abandoned": is_abandoned,
    }).eq("id", str(session_id)).execute()

    # 2. Set agent back to idle
    db.table("agents").update({
        "status": AgentStatus.IDLE.value,
        "updated_at": now,
    }).eq("id", str(chat_agent.agent_id)).execute()

    # 3. End the in-memory session (notifies SSE subscribers)
    await ChatSessionManager.end_session(session_id)

    # 4. Persist summary + archive (await so row is saved before response)
    if not is_abandoned and joined_transcript:
        try:
            await archive_chat_interaction(str(session_id), joined_transcript)
        except Exception as e:
            logger.error("Failed to archive chat session %s: %s", session_id, e)
    else:
        logger.info("Chat %s marked abandoned — skipping archive", session_id)

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
    try:
        await apply_chat_whisper(session_id, request.content)
    except ValueError:
        raise HTTPException(status_code=404, detail="Chat session not found or has ended")

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
    _verify_chat_session_access(session_id, current_user)

    # chat_messages has RLS enabled; webhooks insert via service role.
    # Supervisors must read through service client after access check above.
    db = get_supabase_service_client()
    result = (
        db.table("chat_messages")
        .select("*")
        .eq("interaction_id", str(session_id))
        .order("created_at", desc=False)
        .execute()
    )

    return [ChatMessageResponse.model_validate(msg) for msg in (result.data or [])]


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
    active_sessions = ChatSessionManager.get_active_sessions()

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

