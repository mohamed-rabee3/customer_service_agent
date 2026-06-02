"""Debounced live performance/sentiment updates for chat (parity with voice worker)."""

from __future__ import annotations

import asyncio
import logging
from uuid import UUID

from app.agents.base_agent import analyze_live_metrics_groq, save_realtime_metrics

logger = logging.getLogger(__name__)

_FLUSH_DELAY_SECONDS = 1.4


class ChatLiveMetricsTracker:
    """Per-interaction transcript window + debounced Groq live metrics flush."""

    _lines: dict[UUID, list[str]] = {}
    _tasks: dict[UUID, asyncio.Task] = {}

    @classmethod
    def append_line(cls, interaction_id: UUID, speaker: str, text: str) -> None:
        line = f"{speaker}: {(text or '').strip()}"
        if not line.split(":", 1)[-1].strip():
            return
        bucket = cls._lines.setdefault(interaction_id, [])
        bucket.append(line)
        if len(bucket) > 100:
            cls._lines[interaction_id] = bucket[-80:]
        cls._schedule_flush(interaction_id, line)

    @classmethod
    def clear(cls, interaction_id: UUID) -> None:
        cls._lines.pop(interaction_id, None)
        task = cls._tasks.pop(interaction_id, None)
        if task and not task.done():
            task.cancel()

    @classmethod
    def _schedule_flush(cls, interaction_id: UUID, latest_line: str) -> None:
        prev = cls._tasks.get(interaction_id)
        if prev is not None and not prev.done():
            prev.cancel()
        lines_snapshot = list(cls._lines.get(interaction_id, []))

        async def _run() -> None:
            try:
                await asyncio.sleep(_FLUSH_DELAY_SECONDS)
            except asyncio.CancelledError:
                return
            await cls._flush(interaction_id, lines_snapshot, latest_line)

        cls._tasks[interaction_id] = asyncio.create_task(
            _run(),
            name=f"chat-metrics-{interaction_id}",
        )

    @classmethod
    async def _flush(
        cls,
        interaction_id: UUID,
        lines_snapshot: list[str],
        latest_line: str,
    ) -> None:
        window = "\n".join(lines_snapshot[-60:])
        feed_line = (latest_line or "").strip()
        if not window or not feed_line:
            return
        try:
            perf, sent = await asyncio.to_thread(analyze_live_metrics_groq, window)
            saved = save_realtime_metrics(
                interaction_id=str(interaction_id),
                sentiment=sent,
                satisfaction_score=perf,
                feed_text=feed_line[:8000],
            )
            if not saved:
                return
            payload = {
                "sentiment": sent,
                "satisfaction_score": perf,
                "feed_text": feed_line[:8000],
            }
            from app.agents.chat_session_manager import ChatSessionManager

            await ChatSessionManager.broadcast_event(interaction_id, {
                "type": "metrics",
                "data": payload,
            })
        except Exception as e:
            logger.warning("Chat live metrics flush failed for %s: %s", interaction_id, e)
