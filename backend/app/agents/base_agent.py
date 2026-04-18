"""Base agent utilities for database access from the agent worker process."""

import json
import logging
from typing import Any
from uuid import UUID

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
    issues: dict | None = None,
    tags: dict | None = None,
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
        client.table("realtime_metrics").insert({
            "interaction_id": interaction_id,
            "sentiment": sentiment,
            "satisfaction_score": satisfaction_score,
            "feed_text": feed_text,
        }).execute()
        return True
    except Exception as e:
        logger.error(f"Failed to save metrics for {interaction_id}: {e}")
        return False
