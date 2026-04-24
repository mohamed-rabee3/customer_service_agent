"""Telegram channel handler."""

import logging
import httpx
from typing import AsyncGenerator
from uuid import UUID

logger = logging.getLogger(__name__)


class TelegramService:
    """Handle Telegram-specific messaging logic."""
    
    @staticmethod
    async def send_message(chat_id: int, text: str, bot_token: str) -> bool:
        """Send message via Telegram Bot API."""
        if not bot_token:
            logger.error("❌ TELEGRAM_BOT_TOKEN is not configured!")
            return False
        
        url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
        payload = {"chat_id": chat_id, "text": text}
        
        logger.debug(f"📤 Sending Telegram message to chat {chat_id}")
        
        async with httpx.AsyncClient(timeout=10) as client:
            try:
                response = await client.post(url, json=payload)
                response.raise_for_status()
                logger.info(f"✅ Telegram message sent to {chat_id}")
                return True
            except httpx.HTTPError as e:
                logger.error(f"❌ Failed to send Telegram message: {e}")
                return False
    
    @staticmethod
    def get_call_source_id(chat_id: int) -> str:
        """Format call source ID for Telegram."""
        return f"telegram:{chat_id}"
    
    @staticmethod
    def parse_message(update: dict) -> tuple[int, str] | None:
        """
        Parse Telegram update and extract chat_id and message text.
        
        Returns:
            Tuple of (chat_id, message_text) or None if not a text message
        """
        try:
            if "message" not in update or not update["message"].get("text"):
                return None
            
            chat_id = update["message"]["chat"]["id"]
            text = update["message"]["text"]
            return (chat_id, text)
        except (KeyError, TypeError):
            logger.warning("Failed to parse Telegram update")
            return None
