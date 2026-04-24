"""Instagram Direct Messages channel handler."""

import logging
import httpx
import json
import hmac
import hashlib
from typing import Optional

logger = logging.getLogger(__name__)


class InstagramService:
    """Handle Instagram DM-specific messaging logic."""
    
    @staticmethod
    async def send_message(
        recipient_id: str,
        text: str,
        api_token: str,
        business_account_id: str
    ) -> bool:
        """Send message via Instagram Graph API."""
        url = f"https://graph.instagram.com/v18.0/{recipient_id}/messages"
        
        payload = {
            "messaging_type": "RESPONSE",
            "recipient": {"id": recipient_id},
            "message": {"text": text}
        }
        
        headers = {
            "Authorization": f"Bearer {api_token}",
            "Content-Type": "application/json"
        }
        
        logger.debug(f"📤 Sending Instagram DM to {recipient_id}")
        
        async with httpx.AsyncClient(timeout=10) as client:
            try:
                response = await client.post(url, json=payload, headers=headers)
                response.raise_for_status()
                logger.info(f"✅ Instagram DM sent to {recipient_id}")
                return True
            except httpx.HTTPError as e:
                logger.error(f"❌ Failed to send Instagram DM: {e}")
                return False
    
    @staticmethod
    def get_call_source_id(sender_id: str) -> str:
        """Format call source ID for Instagram."""
        return f"instagram:{sender_id}"
    
    @staticmethod
    def verify_webhook_signature(
        payload_body: str,
        webhook_token: str,
        received_signature: str
    ) -> bool:
        """
        Verify webhook signature from Instagram.
        
        Instagram sends X-Hub-Signature header for verification.
        Signature = 'sha1=' + HMAC-SHA1(payload, webhook_token)
        """
        expected_signature = "sha1=" + hmac.new(
            webhook_token.encode(),
            payload_body.encode(),
            hashlib.sha1
        ).hexdigest()
        
        is_valid = hmac.compare_digest(expected_signature, received_signature)
        if not is_valid:
            logger.warning("❌ Invalid Instagram webhook signature")
        return is_valid
    
    @staticmethod
    def parse_message(payload: dict) -> Optional[tuple[str, str]]:
        """
        Parse Instagram webhook payload and extract sender_id and message text.
        
        Returns:
            Tuple of (sender_id, message_text) or None
        """
        try:
            entry = payload.get("entry", [{}])[0]
            messaging = entry.get("messaging", [{}])[0]
            
            sender_id = messaging.get("sender", {}).get("id")
            message_obj = messaging.get("message", {})
            
            # Only handle text messages for now
            if "text" not in message_obj:
                logger.debug("⏭️ Skipping non-text Instagram message")
                return None
            
            text = message_obj.get("text")
            
            if not sender_id or not text:
                return None
            
            return (sender_id, text)
        except Exception as e:
            logger.warning(f"Failed to parse Instagram webhook payload: {e}")
            return None
    
    @staticmethod
    def build_webhook_response(challenge: str) -> dict:
        """
        Build response for Instagram webhook verification.
        
        Instagram sends GET request with hub.challenge during setup.
        """
        return {
            "hub.challenge": challenge
        }
