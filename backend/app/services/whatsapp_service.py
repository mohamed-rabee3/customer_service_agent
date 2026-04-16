"""WhatsApp channel handler (supports Twilio and Meta)."""

import logging
import httpx
import json
from typing import Optional, Literal
from uuid import UUID

logger = logging.getLogger(__name__)


class WhatsAppService:
    """Handle WhatsApp-specific messaging logic."""
    
    @staticmethod
    async def send_message(
        recipient_phone: str,
        text: str,
        api_token: str,
        provider: Literal["twilio", "meta"] = "twilio"
    ) -> bool:
        """Send message via WhatsApp."""
        if provider == "twilio":
            return await WhatsAppService._send_twilio(recipient_phone, text, api_token)
        elif provider == "meta":
            return await WhatsAppService._send_meta(recipient_phone, text, api_token)
        else:
            logger.error(f"❌ Unknown WhatsApp provider: {provider}")
            return False
    
    @staticmethod
    async def _send_twilio(phone_number: str, text: str, auth_token: str) -> bool:
        """Send message via Twilio WhatsApp."""
        # Format: account_sid:auth_token
        try:
            account_sid, auth_token = auth_token.split(":")
        except ValueError:
            logger.error("❌ Invalid Twilio token format. Expected: account_sid:auth_token")
            return False
        
        url = f"https://api.twilio.com/2010-04-01/Accounts/{account_sid}/Messages.json"
        
        # Need sender phone number - for now use a placeholder
        # In production, this comes from agent config
        from_phone = "whatsapp:+1234567890"  # TODO: Get from agent config
        to_phone = f"whatsapp:{phone_number}"
        
        payload = {
            "From": from_phone,
            "To": to_phone,
            "Body": text
        }
        
        logger.debug(f"📤 Sending WhatsApp message via Twilio to {phone_number}")
        
        async with httpx.AsyncClient(timeout=10) as client:
            try:
                response = await client.post(
                    url,
                    data=payload,
                    auth=(account_sid, auth_token)
                )
                response.raise_for_status()
                logger.info(f"✅ WhatsApp message sent to {phone_number} via Twilio")
                return True
            except httpx.HTTPError as e:
                logger.error(f"❌ Failed to send WhatsApp message via Twilio: {e}")
                return False
    
    @staticmethod
    async def _send_meta(phone_number: str, text: str, api_token: str) -> bool:
        """Send message via Meta WhatsApp Business API."""
        # Format: phone_number_id:api_token
        try:
            phone_number_id, api_token = api_token.split(":")
        except ValueError:
            logger.error("❌ Invalid Meta token format. Expected: phone_number_id:api_token")
            return False
        
        url = f"https://graph.instagram.com/v18.0/{phone_number_id}/messages"
        
        payload = {
            "messaging_product": "whatsapp",
            "to": phone_number,
            "type": "text",
            "text": {"body": text}
        }
        
        headers = {
            "Authorization": f"Bearer {api_token}",
            "Content-Type": "application/json"
        }
        
        logger.debug(f"📤 Sending WhatsApp message via Meta to {phone_number}")
        
        async with httpx.AsyncClient(timeout=10) as client:
            try:
                response = await client.post(url, json=payload, headers=headers)
                response.raise_for_status()
                logger.info(f"✅ WhatsApp message sent to {phone_number} via Meta")
                return True
            except httpx.HTTPError as e:
                logger.error(f"❌ Failed to send WhatsApp message via Meta: {e}")
                return False
    
    @staticmethod
    def get_call_source_id(phone_number: str) -> str:
        """Format call source ID for WhatsApp."""
        return f"whatsapp:{phone_number.replace('+', '')}"
    
    @staticmethod
    def parse_message_twilio(payload: dict) -> Optional[tuple[str, str]]:
        """
        Parse Twilio WhatsApp webhook payload.
        
        Returns:
            Tuple of (phone_number, message_text) or None
        """
        try:
            if payload.get("NumMedia", "0") != "0":
                logger.debug("⏭️ Skipping non-text message from Twilio")
                return None
            
            phone_number = payload.get("From", "").replace("whatsapp:", "")
            text = payload.get("Body", "")
            
            if not phone_number or not text:
                return None
            
            return (phone_number, text)
        except Exception as e:
            logger.warning(f"Failed to parse Twilio WhatsApp payload: {e}")
            return None
    
    @staticmethod
    def parse_message_meta(payload: dict) -> Optional[tuple[str, str]]:
        """
        Parse Meta WhatsApp webhook payload.
        
        Returns:
            Tuple of (phone_number, message_text) or None
        """
        try:
            entry = payload.get("entry", [{}])[0]
            changes = entry.get("changes", [{}])[0]
            value = changes.get("value", {})
            messages = value.get("messages", [])
            
            if not messages:
                return None
            
            message = messages[0]
            if message.get("type") != "text":
                logger.debug("⏭️ Skipping non-text message from Meta")
                return None
            
            phone_number = message.get("from")
            text = message.get("text", {}).get("body")
            
            if not phone_number or not text:
                return None
            
            return (phone_number, text)
        except Exception as e:
            logger.warning(f"Failed to parse Meta WhatsApp payload: {e}")
            return None
