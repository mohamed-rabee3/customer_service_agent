"""Real-time sentiment analysis using LLM."""

import json
import logging
from typing import Any

from app.agents.llm.groq import GroqLLM

logger = logging.getLogger(__name__)

SENTIMENT_PROMPT = """You are a sentiment analysis system for a customer service platform.
Analyze the following conversation between a customer and an AI agent.

You MUST respond with ONLY a valid JSON object (no markdown, no explanation) in this exact format:
{
    "sentiment": "good" | "neutral" | "critical",
    "satisfaction_score": <number between 0 and 100>,
    "feed_text": "<brief 1-sentence summary of the current conversation state>"
}

Rules:
- "good": Customer is happy, issue is being resolved, positive tone
- "neutral": Normal conversation, neither particularly positive nor negative
- "critical": Customer is frustrated, angry, issue is escalating, negative tone
- satisfaction_score: 0 = extremely dissatisfied, 100 = extremely satisfied
- feed_text: A brief supervisor-friendly summary of what's happening right now

Conversation to analyze:
"""

# Default response if analysis fails
DEFAULT_RESULT = {
    "sentiment": "neutral",
    "satisfaction_score": 50.0,
    "feed_text": "Conversation in progress.",
}


class SentimentAnalyzer:
    """
    Analyzes conversation sentiment in real-time.
    
    Called after each message exchange to provide the supervisor
    dashboard with up-to-date sentiment metrics.
    """

    def __init__(self):
        self.llm = GroqLLM()

    async def analyze(self, conversation_history: list[dict]) -> dict[str, Any]:
        """
        Analyze the sentiment of a conversation.
        
        Args:
            conversation_history: List of message dicts with 'role' and 'content'.
                                  Should include system, user, and assistant messages.
        
        Returns:
            dict with keys: sentiment, satisfaction_score, feed_text
        """
        # Build the conversation text for analysis
        conversation_text = self._format_conversation(conversation_history)

        if not conversation_text.strip():
            return DEFAULT_RESULT.copy()

        messages = [
            {
                "role": "system",
                "content": SENTIMENT_PROMPT,
            },
            {
                "role": "user",
                "content": conversation_text,
            },
        ]

        try:
            raw_response = await self.llm.send_message(
                messages=messages,
                temperature=0.1,  # Low temperature for consistent analysis
            )

            return self._parse_response(raw_response)

        except Exception as e:
            logger.error(f"Sentiment analysis failed: {e}")
            return DEFAULT_RESULT.copy()

    def _format_conversation(self, messages: list[dict]) -> str:
        """Format conversation messages into readable text for analysis."""
        lines = []
        for msg in messages:
            role = msg.get("role", "unknown")
            content = msg.get("content", "")

            # Skip system messages from the analysis input
            if role == "system":
                continue

            speaker = "Customer" if role == "user" else "Agent"
            lines.append(f"{speaker}: {content}")

        return "\n".join(lines)

    def _parse_response(self, raw: str) -> dict[str, Any]:
        """Parse the LLM response into a structured result."""
        try:
            # Try to extract JSON from the response
            # Handle cases where LLM wraps in markdown code blocks
            cleaned = raw.strip()
            if cleaned.startswith("```"):
                # Remove markdown code blocks
                lines = cleaned.split("\n")
                cleaned = "\n".join(
                    line for line in lines
                    if not line.strip().startswith("```")
                )

            result = json.loads(cleaned)

            # Validate and clamp values
            sentiment = result.get("sentiment", "neutral")
            if sentiment not in ("good", "neutral", "critical"):
                sentiment = "neutral"

            score = float(result.get("satisfaction_score", 50.0))
            score = max(0.0, min(100.0, score))

            feed_text = str(result.get("feed_text", "Conversation in progress."))

            return {
                "sentiment": sentiment,
                "satisfaction_score": score,
                "feed_text": feed_text,
            }

        except (json.JSONDecodeError, ValueError, KeyError) as e:
            logger.warning(f"Failed to parse sentiment response: {e}. Raw: {raw[:200]}")
            return DEFAULT_RESULT.copy()
