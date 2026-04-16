"""Webhooks endpoints for external channels like Telegram."""
# Webhook handlers

import asyncio
import logging
from datetime import datetime, timezone
from uuid import UUID

import httpx
from fastapi import APIRouter, BackgroundTasks, HTTPException, Path, Request, status
from pydantic import ValidationError

from app.agents.agent_runner import AgentRunner
from app.api.v1.schemas.webhooks import TelegramUpdate
from app.api.v1.schemas.webhooks import TelegramUpdate
from app.core.constants import AgentStatus, InteractionStatus, InteractionType
from app.db.supabase import get_supabase_client, get_supabase_service_client

logger = logging.getLogger(__name__)

router = APIRouter(prefix="", tags=["Webhooks"])


async def analyze_and_metrics_background_task(session_id: UUID, chat_agent):
    """Background task to run sentiment analysis and optionally store it."""
    try:
        metrics = await chat_agent.analyze_sentiment()
        
        db = get_supabase_service_client()
        metrics_data = {
            "interaction_id": str(session_id),
            "sentiment": metrics["sentiment"],
            "satisfaction_score": metrics["satisfaction_score"],
            "feed_text": metrics["feed_text"],
        }
        db.table("realtime_metrics").insert(metrics_data).execute()
        
        # Broadcast metrics to SSE subscribers (supervisors)
        await AgentRunner.broadcast_event(session_id, {
            "type": "metrics",
            "data": metrics,
        })
    except Exception as e:
        logger.error(f"Telegram sentiment analysis failed: {e}")


async def send_telegram_message(chat_id: int, text: str, bot_token: str):
    """Send text message to Telegram Chat."""
    if not bot_token:
        logger.error("TELEGRAM_BOT_TOKEN is not configured for this agent!")
        return

    url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
    payload = {"chat_id": chat_id, "text": text}
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(url, json=payload)
            response.raise_for_status()
        except httpx.HTTPError as e:
            logger.error(f"Failed to send Telegram message: {e}")


@router.post(
    "/telegram/{agent_id}",
    status_code=status.HTTP_200_OK,
    summary="Telegram Bot Webhook",
    description="Receives incoming messages from Telegram and routes them to the specified ChatAgent.",
)
async def telegram_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    agent_id: UUID = Path(..., description="The ID of the AI Agent to handle this webhook"),
):
    """Telegram Webhook Endpoint."""
    
    # 1. Parse Telegram payload
    payload = await request.json()
    try:
        update = TelegramUpdate.model_validate(payload)
    except ValidationError as e:
        logger.error(f"Invalid Telegram payload: {e}")
        return {"status": "ignored", "reason": "validation_error"}

    # We only care about message updates with text for now
    if not update.message or not update.message.text:
        return {"status": "ignored", "reason": "no_text_message"}

    chat_id = update.message.chat.id
    customer_text = update.message.text
    call_source_id = f"telegram:{chat_id}"

    db = get_supabase_service_client()
    now_ts = datetime.now(timezone.utc).isoformat()

    # 2. Lookup Agent & Token up front
    agent_result = (
        db.table("agents")
        .select("id, name, system_prompt, status, agent_type, telegram_bot_token")
        .eq("id", str(agent_id))
        .limit(1)
        .execute()
    )
    if not agent_result.data:
        return {"status": "error", "reason": "agent_not_found"}
        
    agent = agent_result.data[0]
    bot_token = agent.get("telegram_bot_token")
    if not bot_token:
        logger.error(f"Agent {agent_id} does not have a telegram bot token configured.")
        return {"status": "ignored", "reason": "agent_telegram_not_configured"}

    # 3. Check for an active session with this Telegram Chat ID
    session_result = (
        db.table("interactions")
        .select("id")
        .eq("call_source_id", call_source_id)
        .eq("status", InteractionStatus.ACTIVE.value)
        .limit(1)
        .execute()
    )

    interaction_id = None
    chat_agent = None

    if session_result.data:
        # Existing session
        interaction_id = UUID(session_result.data[0]["id"])
        chat_agent = AgentRunner.get_session(interaction_id)
        
        # In case the server restarted and the in-memory agent is gone, we might need to recover it
        if not chat_agent:
             chat_agent = await AgentRunner.start_session(
                 agent_id=agent_id,
                 interaction_id=interaction_id,
                 system_prompt=agent["system_prompt"],
                 agent_name=agent["name"],
             )
             # Restore history from DB
             history_res = db.table("chat_messages").select("role, content").eq("interaction_id", str(interaction_id)).order("created_at").execute()
             for row in history_res.data:
                 # Add to agent's internal history without re-processing
                 mapped_role = "user" if row["role"] == "customer" else "assistant"
                 chat_agent.messages.append({"role": mapped_role, "content": row["content"]})
             
    else:
        # New session needed
        # If agent is busy, let the user know
        if agent["status"] != AgentStatus.IDLE.value and agent["status"] != AgentStatus.IN_CHAT.value:
            # Note: We might allow multiple chats per agent in the future. Right now, checking if idle.
            # However, since this is a Bot, we might just bypass the IDLE check or let it queue.
            # We will bypass the strict IDLE check for Telegram bots since a bot can talk to many people.
            pass
            
        # Create new interaction
        interaction_data = {
            "agent_id": str(agent_id),
            "interaction_type": InteractionType.CHAT.value,
            "status": InteractionStatus.ACTIVE.value,
            "started_at": now_ts,
            "call_source_id": call_source_id
        }
        interaction_result = db.table("interactions").insert(interaction_data).execute()
        if not interaction_result.data:
            return {"status": "error", "reason": "db_insert_failed"}
            
        interaction_id = UUID(interaction_result.data[0]["id"])
        
        # Set to in_chat
        db.table("agents").update({"status": AgentStatus.IN_CHAT.value, "updated_at": now_ts}).eq("id", str(agent_id)).execute()
        
        # Start session
        chat_agent = await AgentRunner.start_session(
             agent_id=agent_id,
             interaction_id=interaction_id,
             system_prompt=agent["system_prompt"],
             agent_name=agent["name"],
        )

    # 3. Save customer message to DB
    customer_msg = {
        "interaction_id": str(interaction_id),
        "role": "customer",
        "content": customer_text,
    }
    db.table("chat_messages").insert(customer_msg).execute()

    # Broadcast to SSE
    await AgentRunner.broadcast_event(interaction_id, {
        "type": "message",
        "data": {
            "role": "customer",
            "content": customer_text,
            "created_at": now_ts,
        },
    })
    
    # 4. Process response in background to avoid Telegram Webhook timeout (needs < 10s)
    async def process_and_send():
        full_response = ""
        try:
            async for chunk in chat_agent.process_message(customer_text):
                full_response += chunk
                
            # Save Agent response to DB
            agent_msg = {
                "interaction_id": str(interaction_id),
                "role": "agent",
                "content": full_response,
            }
            db.table("chat_messages").insert(agent_msg).execute()
            
            # Broadcast to SSE
            await AgentRunner.broadcast_event(interaction_id, {
                "type": "message",
                "data": {
                    "role": "agent",
                    "content": full_response,
                    "created_at": datetime.now(timezone.utc).isoformat(),
                },
            })

            # Send Telegram Reply
            await send_telegram_message(chat_id, full_response, bot_token)
            
            # Run Sentiment Analysis
            await analyze_and_metrics_background_task(interaction_id, chat_agent)
            
        except Exception as e:
            logger.error(f"Error processing Telegram webhook message: {e}")
            await send_telegram_message(chat_id, "I apologize, but I am experiencing technical difficulties.", bot_token)

    # Schedule the processing in the background so Telegram gets an immediate 200 OK.
    background_tasks.add_task(process_and_send)

    return {"status": "processing"}
