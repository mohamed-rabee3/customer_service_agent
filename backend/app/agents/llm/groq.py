"""Groq API integration for chat agent LLM."""

import asyncio
import logging
from typing import AsyncGenerator

from groq import APIError, AsyncGroq, RateLimitError

from app.core.config import settings

logger = logging.getLogger(__name__)


class GroqLLM:
    """
    Wrapper around Groq's chat completions API.

    Supports streaming and non-streaming completions with fallback models.
    """

    FALLBACK_MODELS = [
        "llama-3.1-8b-instant",
        "llama-3.1-70b-versatile",
    ]

    def __init__(self, model: str | None = None):
        self.client = AsyncGroq(api_key=settings.groq_api_key)
        self.primary_model = model or settings.groq_chat_model

    def _get_models_to_try(self) -> list[str]:
        models = [self.primary_model]
        for fallback in self.FALLBACK_MODELS:
            if fallback not in models:
                models.append(fallback)
        return models

    async def send_message_stream(
        self,
        messages: list[dict],
        temperature: float = 0.7,
    ) -> AsyncGenerator[str, None]:
        models_to_try = self._get_models_to_try()

        for model in models_to_try:
            retries = 2
            current_delay = 1.0

            for attempt in range(retries):
                try:
                    logger.debug(
                        "Groq stream attempt model=%s attempt=%s/%s",
                        model,
                        attempt + 1,
                        retries,
                    )
                    stream = await self.client.chat.completions.create(
                        model=model,
                        messages=messages,
                        stream=True,
                        temperature=temperature,
                        timeout=25.0,
                    )

                    async for chunk in stream:
                        if chunk.choices and chunk.choices[0].delta.content:
                            yield chunk.choices[0].delta.content

                    return

                except (RateLimitError, APIError) as e:
                    logger.warning("Groq error with model '%s': %s", model, e)

                    if attempt < retries - 1:
                        logger.info("Retrying in %ss...", current_delay)
                        await asyncio.sleep(current_delay)
                        current_delay *= 2
                    else:
                        break
                except Exception as e:
                    logger.error(
                        "Unexpected Groq error with '%s': %s: %s",
                        model,
                        type(e).__name__,
                        e,
                    )
                    break

        raise Exception("All configured LLM models failed after multiple retries.")

    async def send_message(
        self,
        messages: list[dict],
        temperature: float = 0.3,
    ) -> str:
        models_to_try = self._get_models_to_try()

        for model in models_to_try:
            retries = 2
            for attempt in range(retries):
                try:
                    response = await self.client.chat.completions.create(
                        model=model,
                        messages=messages,
                        temperature=temperature,
                        timeout=20.0,
                    )
                    return response.choices[0].message.content or ""
                except Exception as e:
                    logger.warning(
                        "Groq send_message error with '%s' (attempt %s): %s",
                        model,
                        attempt + 1,
                        e,
                    )
                    if attempt < retries - 1:
                        await asyncio.sleep(1.0)
                    else:
                        break

        return "I apologize, but I am unable to process your request at this time."
