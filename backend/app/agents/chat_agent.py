"""Chat agent implementation."""

import logging
from typing import Any, AsyncGenerator
from uuid import UUID

from app.agents.llm.openrouter_llm import OpenRouterLLM
from app.agents.processors.sentiment_analyzer import SentimentAnalyzer

logger = logging.getLogger(__name__)


class ChatAgent:
    """
    Manages a single chat conversation with an AI agent.
    
    Each ChatAgent instance corresponds to one active chat session (interaction).
    It maintains the conversation history, streams AI responses, and supports
    supervisor whisper injection.
    """

    def __init__(
        self,
        agent_id: UUID,
        interaction_id: UUID,
        system_prompt: str,
        agent_name: str = "Agent",
    ):
        """
        Initialize a chat agent session.
        
        Args:
            agent_id: UUID of the agent from the database.
            interaction_id: UUID of the interaction record.
            system_prompt: System instructions for the AI agent.
            agent_name: Display name of the agent.
        """
        self.agent_id = agent_id
        self.interaction_id = interaction_id
        self.agent_name = agent_name
        self.system_prompt = system_prompt
        self.is_active = True

        # Conversation history in OpenAI message format
        self.messages: list[dict[str, str]] = [
            {"role": "system", "content": system_prompt}
        ]

        # LLM and analysis
        self.llm = OpenRouterLLM()
        self.sentiment_analyzer = SentimentAnalyzer()

    async def process_message(self, user_text: str) -> AsyncGenerator[str, None]:
        """
        Process a customer message and stream the AI response.
        
        Appends the user message to history, streams the LLM response
        token-by-token, and appends the complete response to history.
        
        Args:
            user_text: The customer's message text.
            
        Yields:
            str: Response chunks as they arrive from the LLM.
        """
        if not self.is_active:
            yield "[Session has ended]"
            return

        # Add customer message to history
        self.messages.append({"role": "user", "content": user_text})

        # Stream the AI response
        full_response = ""
        try:
            async for chunk in self.llm.send_message_stream(self.messages):
                full_response += chunk
                yield chunk
        except Exception as e:
            error_str = str(e).lower()
            logger.error(f"LLM streaming error for interaction {self.interaction_id}: {e}")
            
            # Check for specific error types to provide better user feedback
            if "rate-limit" in error_str or "429" in error_str:
                error_msg = "I'm currently receiving too many requests. Please try again in a few minutes."
            elif "all configured llm models failed" in error_str:
                error_msg = "I'm having trouble connecting to my brain right now (all AI models failed). Please contact support if this persists."
            else:
                error_msg = "I apologize, but I'm experiencing a technical issue with my AI response generator. Please try again."
            
            full_response = error_msg
            yield error_msg

        # Add the complete AI response to history
        self.messages.append({"role": "assistant", "content": full_response})

    async def analyze_sentiment(self) -> dict[str, Any]:
        """
        Analyze the current conversation sentiment.
        
        Returns:
            dict with keys: sentiment, satisfaction_score, feed_text
        """
        return await self.sentiment_analyzer.analyze(self.messages)

    def inject_whisper(self, instruction: str) -> None:
        """
        Inject a supervisor instruction into the conversation context.
        
        The instruction is added as a system message so the AI agent
        incorporates it into its next response without the customer
        seeing the raw instruction.
        
        Args:
            instruction: The supervisor's instruction text.
        """
        whisper_message = {
            "role": "system",
            "content": (
                f"[SUPERVISOR INSTRUCTION]: {instruction}. "
                "Incorporate this instruction naturally into your next response "
                "without mentioning that you received an instruction from a supervisor."
            ),
        }
        self.messages.append(whisper_message)
        logger.info(
            f"Whisper injected into interaction {self.interaction_id}: "
            f"{instruction[:50]}..."
        )

    def get_conversation_history(self) -> list[dict[str, str]]:
        """
        Get the conversation history (excluding system messages).
        
        Returns:
            List of message dicts with role and content.
        """
        return [
            msg for msg in self.messages
            if msg["role"] != "system"
        ]

    def end_session(self) -> None:
        """Mark the session as ended."""
        self.is_active = False
        logger.info(f"Chat session ended for interaction {self.interaction_id}")
