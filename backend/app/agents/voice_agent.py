"""Customer service voice agent using LiveKit Agents SDK."""

import asyncio
import logging
from typing import Any

from livekit.agents import Agent, RunContext, function_tool

from app.agents.base_agent import (
    create_tool_permission_request,
    get_tool_permission_status,
    save_realtime_metrics,
)

logger = logging.getLogger(__name__)


class CustomerServiceAgent(Agent):
    """
    AI-powered customer service agent.

    Extends the LiveKit Agent class with customer-service-specific tools
    and behaviors. The agent's system prompt is loaded from the database
    configuration.

    Attributes:
        agent_db_id: UUID of the agent record in Supabase
        interaction_id: UUID of the current interaction record
    """

    def __init__(
        self,
        system_prompt: str,
        agent_db_id: str,
        interaction_id: str,
    ) -> None:
        super().__init__(instructions=system_prompt)
        self.agent_db_id = agent_db_id
        self.interaction_id = interaction_id

    @function_tool()
    async def save_phone_number(
        self,
        context: RunContext,
        phone_number: str,
    ) -> str:
        """Save the customer's phone number. Ask the customer for their phone
        number for follow-up purposes and call this tool to save it.

        Args:
            phone_number: The customer's phone number in international format
        """
        from app.agents.base_agent import _get_client

        try:
            client = _get_client()
            client.table("interactions").update(
                {"phone_number": phone_number}
            ).eq("id", self.interaction_id).execute()
            logger.info(
                f"Saved phone number for interaction {self.interaction_id}"
            )
            return f"Phone number {phone_number} saved successfully."
        except Exception as e:
            logger.error(f"Failed to save phone number: {e}")
            return "I'm sorry, I couldn't save the phone number. Please try again."

    @function_tool()
    async def request_tool_permission(
        self,
        context: RunContext,
        tool_name: str,
        reason: str,
    ) -> str:
        """Request permission from the supervisor to use a sensitive tool.
        Call this when you need to perform an action that requires supervisor
        approval, such as issuing a refund or accessing sensitive customer data.

        Args:
            tool_name: Name of the tool requiring permission
            reason: Brief explanation of why the tool is needed
        """
        # Create pending permission in DB
        permission = create_tool_permission_request(
            interaction_id=self.interaction_id,
            tool_name=tool_name,
        )

        if not permission:
            return "Failed to request permission. Please try again."

        permission_id = permission["id"]
        logger.info(
            f"Requesting permission for tool '{tool_name}' "
            f"(permission_id: {permission_id})"
        )

        # Poll for supervisor response (with timeout)
        max_wait = 60  # 60 seconds timeout
        poll_interval = 2  # Check every 2 seconds
        elapsed = 0

        while elapsed < max_wait:
            await asyncio.sleep(poll_interval)
            elapsed += poll_interval

            status = get_tool_permission_status(permission_id)

            if status == "allowed":
                logger.info(f"Permission {permission_id} ALLOWED")
                return f"Permission granted for '{tool_name}'. You may proceed."

            if status == "denied":
                logger.info(f"Permission {permission_id} DENIED")
                return (
                    f"Permission denied for '{tool_name}'. "
                    "Please inform the customer and suggest alternative solutions."
                )

            if status == "expired":
                break

        logger.warning(f"Permission {permission_id} timed out")
        return (
            f"Permission request for '{tool_name}' timed out. "
            "Please inform the customer that approval is pending and try again later."
        )

    @function_tool()
    async def update_sentiment(
        self,
        context: RunContext,
        sentiment: str,
        satisfaction_score: float,
        summary: str,
    ) -> str:
        """Update the real-time sentiment and satisfaction metrics for this
        interaction. Call this periodically during the conversation to track
        customer sentiment.

        Args:
            sentiment: Current sentiment - must be 'good', 'neutral', or 'critical'
            satisfaction_score: Satisfaction score from 0 to 100
            summary: Brief one-sentence summary of the current conversation state
        """
        # Validate inputs
        if sentiment not in ("good", "neutral", "critical"):
            return "Invalid sentiment value. Use 'good', 'neutral', or 'critical'."
        if not (0 <= satisfaction_score <= 100):
            return "Satisfaction score must be between 0 and 100."

        saved = save_realtime_metrics(
            interaction_id=self.interaction_id,
            sentiment=sentiment,
            satisfaction_score=satisfaction_score,
            feed_text=summary,
        )

        if saved:
            return "Metrics updated successfully."
        return "Failed to update metrics."
