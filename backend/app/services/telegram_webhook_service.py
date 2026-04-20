"""Automatic Telegram webhook setup service."""

import logging
import httpx
from uuid import UUID
from app.core.config import settings

logger = logging.getLogger(__name__)


class TelegramWebhookService:
    """Service to automatically set up Telegram webhooks."""
    
    TELEGRAM_API_URL = "https://api.telegram.org"
    
    @staticmethod
    def get_webhook_url(agent_id: UUID) -> str:
        """
        Generate the webhook URL for an agent.
        
        Args:
            agent_id: UUID of the agent
            
        Returns:
            Full webhook URL
        """
        # Get domain from settings - should be set in .env as WEBHOOK_DOMAIN
        # Pydantic maps environment variables to the lowercase attributes defined in Settings
        domain = getattr(settings, 'webhook_domain', None)
        
        if not domain:
            logger.warning("⚠️  webhook_domain not set in settings. Cannot auto-configure webhook.")
            return None
        
        # Remove trailing slash if present
        domain = domain.rstrip('/')
        
        return f"{domain}/v1/telegram/{agent_id}"
    
    @staticmethod
    async def set_webhook(bot_token: str, agent_id: UUID) -> bool:
        """
        Automatically set up the Telegram webhook for an agent.
        
        Args:
            bot_token: Telegram bot token
            agent_id: UUID of the agent
            
        Returns:
            True if webhook was set successfully, False otherwise
        """
        try:
            if not bot_token or bot_token == "{}":
                logger.info(f"Skipping webhook setup for agent {agent_id}: No valid token provided")
                return False
                
            webhook_url = TelegramWebhookService.get_webhook_url(agent_id)
            
            if not webhook_url:
                logger.warning(f"Cannot set webhook for agent {agent_id}: domain not configured")
                return False
            
            # Call Telegram API to set webhook
            url = f"{TelegramWebhookService.TELEGRAM_API_URL}/bot{bot_token}/setWebhook"
            
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    url,
                    json={
                        "url": webhook_url,
                        "drop_pending_updates": False,  # Keep pending updates
                    }
                )
            
            if response.status_code == 200:
                result = response.json()
                if result.get("ok"):
                    logger.info(f"✅ Webhook set for agent {agent_id}: {webhook_url}")
                    return True
                else:
                    error_msg = result.get("description", "Unknown error")
                    logger.error(f"❌ Telegram API error setting webhook: {error_msg}")
                    return False
            else:
                logger.error(f"❌ Failed to set webhook (HTTP {response.status_code}): {response.text}")
                return False
                
        except Exception as e:
            logger.error(f"❌ Error setting webhook for agent {agent_id}: {e}")
            return False
    
    @staticmethod
    async def delete_webhook(bot_token: str) -> bool:
        """
        Remove the Telegram webhook.
        
        Args:
            bot_token: Telegram bot token
            
        Returns:
            True if webhook was deleted successfully
        """
        try:
            url = f"{TelegramWebhookService.TELEGRAM_API_URL}/bot{bot_token}/deleteWebhook"
            
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(url)
            
            if response.status_code == 200:
                result = response.json()
                if result.get("ok"):
                    logger.info(f"✅ Webhook deleted")
                    return True
                else:
                    logger.error(f"❌ Error deleting webhook: {result.get('description')}")
                    return False
            else:
                logger.error(f"❌ Failed to delete webhook (HTTP {response.status_code})")
                return False
                
        except Exception as e:
            logger.error(f"❌ Error deleting webhook: {e}")
            return False
    
    @staticmethod
    async def get_webhook_info(bot_token: str) -> dict | None:
        """
        Get current webhook information from Telegram.
        
        Args:
            bot_token: Telegram bot token
            
        Returns:
            Webhook info dict or None if error
        """
        try:
            url = f"{TelegramWebhookService.TELEGRAM_API_URL}/bot{bot_token}/getWebhookInfo"
            
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(url)
            
            if response.status_code == 200:
                result = response.json()
                if result.get("ok"):
                    return result.get("result", {})
                else:
                    logger.error(f"❌ Error getting webhook info: {result.get('description')}")
                    return None
            else:
                logger.error(f"❌ Failed to get webhook info (HTTP {response.status_code})")
                return None
                
        except Exception as e:
            logger.error(f"❌ Error getting webhook info: {e}")
            return None
