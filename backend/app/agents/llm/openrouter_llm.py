"""OpenRouter LLM integration via OpenAI-compatible API."""

from typing import AsyncGenerator

from openai import AsyncOpenAI

from app.core.config import settings


class OpenRouterLLM:
    """
    Wrapper around OpenRouter's OpenAI-compatible API.
    
    Uses the `openai` Python SDK pointed at OpenRouter's base URL.
    Supports both streaming and non-streaming chat completions.
    """

    def __init__(self, model: str | None = None):
        """
        Initialize the OpenRouter LLM client.
        
        Args:
            model: Override model name. Defaults to settings.openrouter_model.
        """
        self.client = AsyncOpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=settings.openrouter_api_key,
        )
        self.model = model or settings.openrouter_model

    async def send_message_stream(
        self,
        messages: list[dict],
        temperature: float = 0.7,
    ) -> AsyncGenerator[str, None]:
        """
        Stream a chat completion response token-by-token.
        
        Args:
            messages: List of message dicts with 'role' and 'content'.
            temperature: Sampling temperature (0.0 - 2.0).
            
        Yields:
            str: Content chunks as they arrive from the model.
        """
        stream = await self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            stream=True,
            temperature=temperature,
        )

        async for chunk in stream:
            if chunk.choices and chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content

    async def send_message(
        self,
        messages: list[dict],
        temperature: float = 0.3,
    ) -> str:
        """
        Send a message and get the full response (non-streaming).
        
        Used for structured outputs like sentiment analysis where
        we need the full response before parsing.
        
        Args:
            messages: List of message dicts with 'role' and 'content'.
            temperature: Sampling temperature (lower for analysis).
            
        Returns:
            str: The complete response content.
        """
        response = await self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=temperature,
        )

        return response.choices[0].message.content or ""
