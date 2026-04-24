"""Base agent utilities for database access from the agent worker process."""

import json
import logging
import re
from typing import Any, List, Tuple
from uuid import UUID

from groq import Groq
from supabase import Client, create_client

from app.core.config import settings
from app.core.constants import AgentStatus, ToolPermissionStatus

logger = logging.getLogger(__name__)

# The agent worker runs as a separate process, so we need its own Supabase client
_agent_supabase: Client | None = None


def _get_client() -> Client:
    """Get Supabase client for agent worker process."""
    global _agent_supabase
    if _agent_supabase is None:
        _agent_supabase = create_client(
            settings.supabase_url,
            settings.supabase_service_key,  # Use service key for agent operations
        )
    return _agent_supabase


def fetch_agent_config(agent_id: str) -> dict[str, Any] | None:
    """
    Load agent configuration from Supabase.

    Args:
        agent_id: UUID string of the agent

    Returns:
        Agent config dict or None if not found
    """
    try:
        client = _get_client()
        response = (
            client.table("agents")
            .select("*")
            .eq("id", agent_id)
            .limit(1)
            .execute()
        )
        if response.data:
            return response.data[0]
        return None
    except Exception as e:
        logger.error(f"Failed to fetch agent config for {agent_id}: {e}")
        return None


def update_agent_status(agent_id: str, status: AgentStatus) -> bool:
    """
    Update agent status in database.

    Args:
        agent_id: UUID string of the agent
        status: New agent status

    Returns:
        True if successful
    """
    try:
        client = _get_client()
        client.table("agents").update(
            {"status": status.value}
        ).eq("id", agent_id).execute()
        logger.info(f"Agent {agent_id} status updated to {status.value}")
        return True
    except Exception as e:
        logger.error(f"Failed to update agent {agent_id} status: {e}")
        return False


def create_tool_permission_request(
    interaction_id: str,
    tool_name: str,
) -> dict[str, Any] | None:
    """
    Create a pending tool permission request in the database.

    Args:
        interaction_id: UUID string of the interaction
        tool_name: Name of the tool requesting permission

    Returns:
        Created permission record or None on failure
    """
    try:
        client = _get_client()
        response = (
            client.table("tool_permissions")
            .insert({
                "interaction_id": interaction_id,
                "tool_name": tool_name,
                "status": ToolPermissionStatus.PENDING.value,
            })
            .execute()
        )
        if response.data:
            logger.info(
                f"Created permission request for tool '{tool_name}' "
                f"on interaction {interaction_id}"
            )
            return response.data[0]
        return None
    except Exception as e:
        logger.error(f"Failed to create permission request: {e}")
        return None


def get_tool_permission_status(permission_id: str) -> str | None:
    """
    Check the status of a tool permission request.

    Args:
        permission_id: UUID string of the permission

    Returns:
        Status string or None if not found
    """
    try:
        client = _get_client()
        response = (
            client.table("tool_permissions")
            .select("status, supervisor_response")
            .eq("id", permission_id)
            .limit(1)
            .execute()
        )
        if response.data:
            return response.data[0].get("status")
        return None
    except Exception as e:
        logger.error(f"Failed to check permission {permission_id}: {e}")
        return None


def save_interaction_summary(
    interaction_id: str,
    summary: str,
    issues: dict | list | None = None,
    tags: dict | list | None = None,
) -> bool:
    """
    Save post-call summary, issues, and tags to the interaction record.

    Args:
        interaction_id: UUID string of the interaction
        summary: AI-generated summary
        issues: Extracted issues dict
        tags: Generated tags dict

    Returns:
        True if successful
    """
    try:
        client = _get_client()
        update_data: dict[str, Any] = {"summary": summary}
        if issues is not None:
            update_data["issues"] = issues
        if tags is not None:
            update_data["tags"] = tags
        client.table("interactions").update(update_data).eq(
            "id", interaction_id
        ).execute()
        logger.info(f"Saved summary for interaction {interaction_id}")
        return True
    except Exception as e:
        logger.error(f"Failed to save summary for {interaction_id}: {e}")
        return False


def upsert_interaction_archive_record(
    interaction_id: str,
    summary: str,
    overall_performance: float,
    sentiment: str,
    issues: dict | list | None,
    tags: dict | list | None,
) -> bool:
    """
    Persist post-call LLM snapshot to ``public.archive`` (Groq / Llama 3.1 8B Instant).
    """
    try:
        client = _get_client()
        perf = max(0.0, min(100.0, float(overall_performance)))
        issues_val: Any = issues if isinstance(issues, list) else []
        tags_val: Any = tags if isinstance(tags, list) else []
        row = {
            "interaction_id": interaction_id,
            "summary": summary,
            "overall_performance": perf,
            "sentiment": normalize_sentiment_for_db(sentiment),
            "issues": issues_val,
            "tags": tags_val,
            "groq_model": settings.groq_monitoring_model,
        }
        client.table("archive").upsert(row, on_conflict="interaction_id").execute()
        logger.info("Upserted archive row for interaction %s", interaction_id)
        return True
    except Exception as e:
        logger.error("Failed to upsert archive for %s: %s", interaction_id, e)
        return False


def normalize_sentiment_for_db(sentiment: str) -> str:
    """
    Map UI / model labels to Supabase sentiment_enum (good, neutral, critical).

    ``critical`` in the DB corresponds to a negative ("bad") customer tone.
    """
    s = (sentiment or "").strip().lower()
    if s == "bad":
        return "critical"
    if s in ("good", "neutral", "critical"):
        return s
    return "neutral"


def analyze_live_metrics_groq(transcript_window: str) -> tuple[float, str]:
    """
    Use Groq Llama 3.1 8B Instant to score the latest call segment.

    Returns:
        (performance 0–100, sentiment one of good | neutral | bad)
    """
    text = (transcript_window or "").strip()
    if not text:
        return 50.0, "neutral"

    if not settings.groq_api_key:
        logger.warning("GROQ_API_KEY missing; skipping live metrics analysis")
        return 50.0, "neutral"

    system = (
        "You evaluate short customer-service call excerpts for supervisors. "
        "Reply with JSON only, no markdown, no extra keys. "
        'Schema: {"performance": <integer 0-100>, "sentiment": "good"|"neutral"|"bad"}. '
        "performance = how well the agent is handling the customer on this excerpt "
        "(helpfulness, clarity, professionalism). "
        "sentiment = the customer's apparent emotional tone toward the service "
        "(bad = frustrated, angry, or very dissatisfied)."
    )
    user = f"Transcript excerpt (latest lines):\n{text}"

    try:
        client = Groq(api_key=settings.groq_api_key)
        completion = client.chat.completions.create(
            model=settings.groq_monitoring_model,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            temperature=0.2,
            max_tokens=120,
            response_format={"type": "json_object"},
        )
        raw = (completion.choices[0].message.content or "").strip()
        data = json.loads(raw)
        perf = float(data.get("performance", 50))
        perf = max(0.0, min(100.0, perf))
        sent = str(data.get("sentiment", "neutral")).strip().lower()
        if sent not in ("good", "neutral", "bad"):
            sent = "neutral"
        return perf, sent
    except Exception as e:
        logger.warning("Groq live metrics analysis failed: %s", e)
        try:
            client = Groq(api_key=settings.groq_api_key)
            completion = client.chat.completions.create(
                model=settings.groq_monitoring_model,
                messages=[
                    {"role": "system", "content": system},
                    {"role": "user", "content": user},
                ],
                temperature=0.2,
                max_tokens=120,
            )
            raw = (completion.choices[0].message.content or "").strip()
            m = re.search(r"\{[^{}]*\}", raw, re.DOTALL)
            if m:
                data = json.loads(m.group(0))
                perf = float(data.get("performance", 50))
                perf = max(0.0, min(100.0, perf))
                sent = str(data.get("sentiment", "neutral")).strip().lower()
                if sent not in ("good", "neutral", "bad"):
                    sent = "neutral"
                return perf, sent
        except Exception as e2:
            logger.warning("Groq live metrics fallback parse failed: %s", e2)
        return 50.0, "neutral"


def summarize_voice_call_groq(
    transcript: str,
) -> Tuple[str, List[dict[str, Any]], List[str], float, str]:
    """
    End-of-call analysis via Groq (``groq_monitoring_model``, default Llama 3.1 8B Instant).

    Returns:
        summary_text, issues (JSON-serializable), topic_tags, overall_performance 0-100,
        sentiment (good | neutral | bad — ``bad`` maps to DB ``critical``).
    """
    text = (transcript or "").strip()
    if not text:
        return (
            "Call ended; no transcript was captured for summarization.",
            [],
            [],
            0.0,
            "neutral",
        )

    if not settings.groq_api_key:
        logger.warning("GROQ_API_KEY missing; skipping call summary")
        return (
            "Call completed.",
            [],
            [],
            0.0,
            "neutral",
        )

    system = (
        "You analyze completed customer service voice calls for supervisors. "
        "Reply with JSON only, no markdown. "
        'Schema: {"summary": string (2-4 sentences), '
        '"overall_performance": number (integer 0-100, agent quality for the whole call: '
        "helpfulness, clarity, resolution), "
        '"sentiment": "good"|"neutral"|"bad" (customer emotional tone toward the service; '
        "bad = frustrated or very dissatisfied), "
        '"issues": [{"type": string, "resolved": boolean}], '
        '"topic_tags": string[] (short labels e.g. billing, account, technical)}. '
        "Mark resolved true if the customer's request appears addressed."
    )
    user = f"Full call transcript (Customer/Agent lines):\n{text[:24000]}"

    try:
        client = Groq(api_key=settings.groq_api_key)
        completion = client.chat.completions.create(
            model=settings.groq_monitoring_model,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            temperature=0.3,
            max_tokens=512,
            response_format={"type": "json_object"},
        )
        raw = (completion.choices[0].message.content or "").strip()
        data = json.loads(raw)
        summary = str(data.get("summary", "")).strip() or "Call completed."
        try:
            overall_performance = float(data.get("overall_performance", 50))
        except (TypeError, ValueError):
            overall_performance = 50.0
        overall_performance = max(0.0, min(100.0, overall_performance))

        sent = str(data.get("sentiment", "neutral")).strip().lower()
        if sent not in ("good", "neutral", "bad"):
            sent = "neutral"

        issues_raw = data.get("issues") or []
        issues: List[dict[str, Any]] = []
        if isinstance(issues_raw, list):
            for it in issues_raw:
                if isinstance(it, dict) and it.get("type"):
                    issues.append(
                        {
                            "type": str(it["type"]),
                            "resolved": bool(it.get("resolved", True)),
                        }
                    )
        if not issues:
            issues = [{"type": "general", "resolved": True}]

        tags_raw = data.get("topic_tags") or []
        tags: List[str] = []
        if isinstance(tags_raw, list):
            tags = [str(t).strip() for t in tags_raw if str(t).strip()]

        return summary, issues, tags, overall_performance, sent
    except Exception as e:
        logger.warning("Groq call summary failed: %s", e)
        return (
            "Call completed; automatic summary failed.",
            [{"type": "general", "resolved": True}],
            [],
            0.0,
            "neutral",
        )


def save_realtime_metrics(
    interaction_id: str,
    sentiment: str,
    satisfaction_score: float,
    feed_text: str,
) -> bool:
    """
    Save a realtime metrics snapshot during an interaction.

    Args:
        interaction_id: UUID string of the interaction
        sentiment: Current sentiment (good/neutral/critical)
        satisfaction_score: Score 0-100
        feed_text: AI-generated summary sentence

    Returns:
        True if successful
    """
    try:
        client = _get_client()
        res = (
            client.table("realtime_metrics")
            .insert(
                {
                    "interaction_id": interaction_id,
                    "sentiment": normalize_sentiment_for_db(sentiment),
                    "satisfaction_score": satisfaction_score,
                    "feed_text": feed_text,
                }
            )
            .execute()
        )
        return bool(res.data)
    except Exception as e:
        logger.error(f"Failed to save metrics for {interaction_id}: {e}")
        return False
