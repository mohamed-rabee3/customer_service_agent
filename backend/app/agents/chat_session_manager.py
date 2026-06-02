"""Chat session lifecycle management.

# TODO: migrate to Redis Pub/Sub for SSE events and store active session
# context in a caching layer to survive FastAPI worker restarts / multi-worker
# deployments.  (See V3 code review — In-Memory State Loss Risks)
"""

import asyncio
import logging
import time
from datetime import datetime, timezone
from uuid import UUID

from app.agents.chat_agent import ChatAgent
from app.agents.chat_live_metrics import ChatLiveMetricsTracker
from app.core.config import settings
from app.core.constants import AgentStatus, InteractionStatus, InteractionType

logger = logging.getLogger(__name__)


async def ensure_chat_session(interaction_id: UUID) -> ChatAgent | None:
    """
    Return an in-memory chat session, loading from DB if the interaction is still active.
    """
    existing = ChatSessionManager.get_session(interaction_id)
    if existing:
        return existing

    from app.db.supabase import get_supabase_service_client

    db = get_supabase_service_client()
    interaction_row = (
        db.table("interactions")
        .select("id, agent_id, status")
        .eq("id", str(interaction_id))
        .limit(1)
        .execute()
    )
    if not interaction_row.data:
        return None
    row = interaction_row.data[0]
    if row["status"] != InteractionStatus.ACTIVE.value:
        return None

    agent_id = UUID(row["agent_id"])
    agent_row = (
        db.table("agents")
        .select("id, name, system_prompt")
        .eq("id", str(agent_id))
        .limit(1)
        .execute()
    )
    if not agent_row.data:
        return None
    agent = agent_row.data[0]

    chat_agent = await ChatSessionManager.start_session(
        agent_id=agent_id,
        interaction_id=interaction_id,
        system_prompt=agent["system_prompt"],
        agent_name=agent["name"],
    )

    history_res = (
        db.table("chat_messages")
        .select("role, content")
        .eq("interaction_id", str(interaction_id))
        .order("created_at")
        .execute()
    )
    for msg in history_res.data or []:
        role = msg.get("role")
        content = (msg.get("content") or "").strip()
        if not content:
            continue
        if role == "customer":
            chat_agent.messages.append({"role": "user", "content": content})
        elif role == "agent":
            chat_agent.messages.append({"role": "assistant", "content": content})
        elif role == "supervisor":
            chat_agent.inject_whisper(content)

    logger.info("Recovered chat session %s from database (%s messages)", interaction_id, len(history_res.data or []))
    return chat_agent


async def apply_chat_whisper(interaction_id: UUID, content: str) -> ChatAgent:
    """Inject supervisor instruction into chat agent context and notify SSE subscribers."""
    from app.db.supabase import get_supabase_service_client

    chat_agent = await ensure_chat_session(interaction_id)
    if not chat_agent:
        raise ValueError("Chat session not found or has ended")

    chat_agent.inject_whisper(content)
    now = datetime.now(timezone.utc).isoformat()

    db = get_supabase_service_client()
    db.table("chat_messages").insert({
        "interaction_id": str(interaction_id),
        "role": "supervisor",
        "content": content,
    }).execute()

    await ChatSessionManager.broadcast_event(interaction_id, {
        "type": "whisper",
        "data": {"role": "supervisor", "content": content, "created_at": now},
    })
    return chat_agent


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
    _finalize_lock = asyncio.Lock()

    # SSE subscriber queues per interaction_id
    # Each interaction can have multiple subscribers (supervisors)
    _subscribers: dict[UUID, list[asyncio.Queue]] = {}

    # Inactivity tracking (monotonic timestamps)
    _last_activity: dict[UUID, float] = {}
    _idle_tasks: dict[UUID, asyncio.Task] = {}

    @classmethod
    def _idle_timeout_seconds(cls) -> int:
        return max(30, int(settings.chat_idle_timeout_seconds))

    @classmethod
    def _cancel_idle_timer(cls, interaction_id: UUID) -> None:
        task = cls._idle_tasks.pop(interaction_id, None)
        if task and not task.done():
            task.cancel()
        cls._last_activity.pop(interaction_id, None)

    @classmethod
    def _schedule_idle_timer(cls, interaction_id: UUID) -> None:
        cls._cancel_idle_timer(interaction_id)
        cls._last_activity[interaction_id] = time.monotonic()
        cls._idle_tasks[interaction_id] = asyncio.create_task(
            cls._idle_watchdog(interaction_id),
            name=f"chat-idle-{interaction_id}",
        )

    @classmethod
    async def _idle_watchdog(cls, interaction_id: UUID) -> None:
        timeout = cls._idle_timeout_seconds()
        try:
            await asyncio.sleep(timeout)
            last = cls._last_activity.get(interaction_id)
            if last is None:
                return
            if time.monotonic() - last >= timeout - 0.5:
                logger.info(
                    "Chat session %s idle for %ss — closing",
                    interaction_id,
                    timeout,
                )
                await finalize_chat_session_on_idle(interaction_id)
        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.error("Idle watchdog failed for %s: %s", interaction_id, e)

    @classmethod
    async def record_activity(cls, interaction_id: UUID) -> None:
        """Reset the inactivity timer (call on customer or agent messages)."""
        if interaction_id not in cls._sessions:
            return
        cls._schedule_idle_timer(interaction_id)

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
            cls._schedule_idle_timer(interaction_id)
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
        cls._cancel_idle_timer(interaction_id)
        ChatLiveMetricsTracker.clear(interaction_id)

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


def _transcript_lines_from_history(history: list[dict]) -> list[str]:
    lines: list[str] = []
    for msg in history:
        role = msg.get("role", "")
        content = (msg.get("content") or "").strip()
        if not content:
            continue
        if role in ("user", "customer"):
            lines.append(f"Customer: {content}")
        elif role in ("assistant", "agent"):
            lines.append(f"Agent: {content}")
        elif role == "supervisor":
            lines.append(f"Supervisor: {content}")
    return lines


def _transcript_lines_from_db_rows(rows: list[dict]) -> list[str]:
    lines: list[str] = []
    for row in rows:
        content = (row.get("content") or "").strip()
        if not content:
            continue
        if row.get("role") == "customer":
            lines.append(f"Customer: {content}")
        elif row.get("role") == "agent":
            lines.append(f"Agent: {content}")
        elif row.get("role") == "supervisor":
            lines.append(f"Supervisor: {content}")
    return lines


async def finalize_chat_session_on_idle(interaction_id: UUID) -> None:
    """
    End an active chat after inactivity: complete interaction, free agent if
    no other active chats, tear down in-memory session, optionally summarize.
    """
    async with ChatSessionManager._finalize_lock:
        from app.db.supabase import get_supabase_service_client

        db = get_supabase_service_client()
        interaction_row = (
            db.table("interactions")
            .select("id, agent_id, status, started_at")
            .eq("id", str(interaction_id))
            .limit(1)
            .execute()
        )
        if not interaction_row.data:
            await ChatSessionManager.end_session(interaction_id)
            return

        row = interaction_row.data[0]
        if row["status"] != InteractionStatus.ACTIVE.value:
            await ChatSessionManager.end_session(interaction_id)
            return

        agent_id = row["agent_id"]
        now = datetime.now(timezone.utc).isoformat()

        chat_agent = ChatSessionManager.get_session(interaction_id)
        if chat_agent:
            transcript_lines = _transcript_lines_from_history(
                chat_agent.get_conversation_history()
            )
        else:
            history_res = (
                db.table("chat_messages")
                .select("role, content")
                .eq("interaction_id", str(interaction_id))
                .order("created_at")
                .execute()
            )
            transcript_lines = _transcript_lines_from_db_rows(history_res.data or [])

        joined_transcript = "\n".join(transcript_lines)
        has_agent_reply = any(line.startswith("Agent:") for line in transcript_lines)
        is_abandoned = len(transcript_lines) == 0 or not has_agent_reply
        final_status = (
            InteractionStatus.ABANDONED.value
            if is_abandoned
            else InteractionStatus.COMPLETED.value
        )

        db.table("interactions").update({
            "status": final_status,
            "end_at": now,
            "is_abandoned": is_abandoned,
        }).eq("id", str(interaction_id)).execute()

        other_active = (
            db.table("interactions")
            .select("id")
            .eq("agent_id", agent_id)
            .eq("status", InteractionStatus.ACTIVE.value)
            .neq("id", str(interaction_id))
            .limit(1)
            .execute()
        )
        if not other_active.data:
            db.table("agents").update({
                "status": AgentStatus.IDLE.value,
                "updated_at": now,
            }).eq("id", agent_id).execute()

        await ChatSessionManager.end_session(interaction_id)

        if not is_abandoned and joined_transcript:
            from app.agents.base_agent import archive_chat_interaction

            try:
                await archive_chat_interaction(str(interaction_id), joined_transcript)
            except Exception as e:
                logger.error(
                    "Failed to archive chat interaction %s: %s",
                    interaction_id,
                    e,
                )
        else:
            logger.info(
                "Chat %s closed due to idle (%s) — skipping archive",
                interaction_id,
                final_status,
            )


async def sweep_stale_active_chat_sessions() -> None:
    """Close DB-active chats with no recent messages (e.g. after server restart)."""
    from app.db.supabase import get_supabase_service_client

    timeout = ChatSessionManager._idle_timeout_seconds()
    db = get_supabase_service_client()
    active = (
        db.table("interactions")
        .select("id, started_at")
        .eq("status", InteractionStatus.ACTIVE.value)
        .eq("interaction_type", InteractionType.CHAT.value)
        .execute()
    )
    if not active.data:
        return

    now = datetime.now(timezone.utc)

    for row in active.data:
        interaction_id = UUID(row["id"])
        if interaction_id in ChatSessionManager.get_active_sessions():
            continue

        msg_res = (
            db.table("chat_messages")
            .select("created_at")
            .eq("interaction_id", str(interaction_id))
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        if msg_res.data:
            last_at = datetime.fromisoformat(
                msg_res.data[0]["created_at"].replace("Z", "+00:00")
            )
        else:
            last_at = datetime.fromisoformat(
                row["started_at"].replace("Z", "+00:00")
            )

        if (now - last_at).total_seconds() >= timeout:
            logger.info(
                "Sweeping stale chat interaction %s (inactive %.0fs)",
                interaction_id,
                (now - last_at).total_seconds(),
            )
            await finalize_chat_session_on_idle(interaction_id)


async def repair_completed_chats_missing_archive() -> None:
    """Backfill archive rows for completed chats that never got summarized."""
    from app.agents.base_agent import archive_chat_interaction
    from app.db.supabase import get_supabase_service_client

    db = get_supabase_service_client()
    completed = (
        db.table("interactions")
        .select("id")
        .eq("interaction_type", InteractionType.CHAT.value)
        .eq("status", InteractionStatus.COMPLETED.value)
        .order("end_at", desc=True)
        .limit(15)
        .execute()
    )
    if not completed.data:
        return

    for row in completed.data:
        iid = str(row["id"])
        existing = (
            db.table("archive")
            .select("interaction_id")
            .eq("interaction_id", iid)
            .limit(1)
            .execute()
        )
        if existing.data:
            continue

        history_res = (
            db.table("chat_messages")
            .select("role, content")
            .eq("interaction_id", iid)
            .order("created_at")
            .execute()
        )
        transcript_lines = _transcript_lines_from_db_rows(history_res.data or [])
        if not transcript_lines:
            continue
        joined = "\n".join(transcript_lines)
        try:
            logger.info("Backfilling archive for completed chat %s", iid)
            await archive_chat_interaction(iid, joined)
        except Exception as e:
            logger.error("Archive backfill failed for %s: %s", iid, e)


async def run_chat_idle_sweeper(stop_event: asyncio.Event) -> None:
    """Background loop for orphaned active interactions in the database."""
    while not stop_event.is_set():
        try:
            await sweep_stale_active_chat_sessions()
            await repair_completed_chats_missing_archive()
        except Exception as e:
            logger.error("Chat idle sweeper error: %s", e)
        try:
            await asyncio.wait_for(stop_event.wait(), timeout=30.0)
        except asyncio.TimeoutError:
            pass
