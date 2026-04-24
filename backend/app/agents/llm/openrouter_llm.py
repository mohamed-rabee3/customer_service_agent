import asyncio
import logging
from typing import AsyncGenerator

from openai import AsyncOpenAI, APIError, RateLimitError

from app.core.config import settings

logger = logging.getLogger(__name__)

class OpenRouterLLM:
    """
    Wrapper around OpenRouter's OpenAI-compatible API.
    
    Uses the `openai` Python SDK pointed at OpenRouter's base URL.
    Supports both streaming and non-streaming chat completions.
    Includes robust fallback to alternative models on failure.
    """

    # List of stable free models to try in sequence on failure
    FALLBACK_MODELS = [
        "nvidia/nemotron-3-super-120b-a12b:free",
        "openrouter/elephant-alpha",
        "meta-llama/llama-3.2-3b-instruct:free",
        "meta-llama/llama-3.1-8b-instruct:free",
    ]

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
        self.primary_model = model or settings.openrouter_model

    def _get_models_to_try(self) -> list[str]:
        """Get a list of models to try in sequence."""
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
        """
        Stream a chat completion response token-by-token with automatic fallback.
        
        Args:
            messages: List of message dicts with 'role' and 'content'.
            temperature: Sampling temperature (0.0 - 2.0).
            
        Yields:
            str: Content chunks as they arrive from the model.
        """
        models_to_try = self._get_models_to_try()
        
        for model in models_to_try:
            retries = 2
            current_delay = 1.0
            
            for attempt in range(retries):
                try:
                    logger.debug(f"Attempting model '{model}' (attempt {attempt+1}/{retries})")
                    stream = await self.client.chat.completions.create(
                        model=model,
                        messages=messages,
                        stream=True,
                        temperature=temperature,
                        timeout=25.0
                    )

                    async for chunk in stream:
                        if chunk.choices and chunk.choices[0].delta.content:
                            yield chunk.choices[0].delta.content
                    
                    # If we reached here without exception, streaming was successful
                    return

                except (RateLimitError, APIError) as e:
                    logger.warning(f"Error with model '{model}': {e}")
                    
                    if attempt < retries - 1:
                        logger.info(f"Retrying in {current_delay}s...")
                        await asyncio.sleep(current_delay)
                        current_delay *= 2  # Exponential backoff
                    else:
                        logger.error(f"Model '{model}' failed after {retries} attempts.")
                        # Break out of attempts, cycle to next model
                        break
                except Exception as e:
                    logger.error(f"Unexpected error with '{model}': {type(e).__name__}: {e}")
                    # Most other exceptions might be unrecoverable for this model, move to next
                    break
        
        raise Exception("All configured LLM models failed after multiple retries.")

    async def send_message(
        self,
        messages: list[dict],
        temperature: float = 0.3,
    ) -> str:
        """
        Send a message and get the full response (non-streaming) with automatic fallback.
        
        Args:
            messages: List of message dicts...
            
        Returns:
            str: The complete response content.
        """
        models_to_try = self._get_models_to_try()
        
        for model in models_to_try:
            retries = 2
            for attempt in range(retries):
                try:
                    response = await self.client.chat.completions.create(
                        model=model,
                        messages=messages,
                        temperature=temperature,
                        timeout=20.0
                    )
                    return response.choices[0].message.content or ""
                except Exception as e:
                    logger.warning(f"Error in send_message with '{model}' (attr {attempt+1}): {e}")
                    if attempt < retries - 1:
                        await asyncio.sleep(1.0)
                    else:
                        break
        
        return "I apologize, but I am unable to process your request at this time."
