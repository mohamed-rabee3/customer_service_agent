"""Agent service - Business logic layer for agent operations."""

import logging
from datetime import datetime, timezone
from uuid import UUID

from fastapi import HTTPException, status

from app.agents.chat_session_manager import ChatSessionManager
from app.api.v1.schemas.agent import CreateAgentRequest, UpdateAgentRequest
from app.core.constants import (
    MAX_AGENTS_PER_SUPERVISOR,
    AgentStatus,
    AgentType,
    InteractionStatus,
)
from app.core.exceptions import (
    AgentBusyException,
    ForbiddenException,
    NotFoundException,
)
from app.db.supabase import get_supabase_service_client
from app.repositories.agent_repository import AgentModel, agent_repository
from app.services.telegram_webhook_service import TelegramWebhookService

logger = logging.getLogger(__name__)


def validate_telegram_token(token: str | None) -> bool:
    """
    Validate Telegram bot token format.
    """
    if not token:
        return True
    
    token = token.strip()
    if not token or token == "{}":
        return True
    
    # Very basic check: just ensure a colon exists. Let Telegram API handle the rest.
    if ':' not in token:
        logger.warning(f"Invalid telegram token format (no colon found): {token[:10]}...")
        return False
    
    return True


def _is_status_only_update(request: UpdateAgentRequest) -> bool:
    """True when the request only changes agent status (pause / resume)."""
    return request.status is not None and all(
        field is None
        for field in (
            request.name,
            request.system_prompt,
            request.telegram_bot_token,
            request.webhook_configs,
            request.mcp_tools,
        )
    )


async def release_agent_from_active_chats(agent_id: UUID) -> None:
    """
    End in-memory chat sessions and complete active DB interactions for an agent.

    Used when pausing, resuming to idle, or deleting a chat agent that is stuck
  in ``in_chat`` (e.g. after a server restart or an abandoned Telegram session).
    """
    now = datetime.now(timezone.utc).isoformat()
    db = get_supabase_service_client()

    active_sessions = ChatSessionManager.get_active_sessions()
    for interaction_id, chat_agent in list(active_sessions.items()):
        if chat_agent.agent_id == agent_id:
            await ChatSessionManager.end_session(interaction_id)

    db.table("interactions").update({
        "status": InteractionStatus.COMPLETED.value,
        "end_at": now,
    }).eq("agent_id", str(agent_id)).eq(
        "status", InteractionStatus.ACTIVE.value
    ).execute()

    logger.info("Released agent %s from active chat sessions", agent_id)


def list_agents(
    supervisor_id: UUID,
    role: str,
    agent_type: str | None = None,
) -> list[AgentModel]:
    """
    List agents. Supervisors see their own, admins see all.
    Optionally filter by agent_type ('voice' or 'chat').
    """
    if role == "admin":
        agents = agent_repository.get_all()
    else:
        agents = agent_repository.get_by_supervisor(supervisor_id)

    if agent_type:
        agents = [a for a in agents if a.agent_type.value == agent_type]

    return agents


def create_agent(
    supervisor_id: UUID,
    request: CreateAgentRequest,
    agent_type: AgentType = AgentType.VOICE,
) -> AgentModel:
    """
    Create a new agent for a supervisor.
    """
    current_count = agent_repository.count_by_supervisor(
        supervisor_id, agent_type=agent_type
    )

    if current_count >= MAX_AGENTS_PER_SUPERVISOR:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Maximum {MAX_AGENTS_PER_SUPERVISOR} agents allowed per supervisor",
        )

    # Validate Telegram token if provided
    if request.telegram_bot_token and not validate_telegram_token(request.telegram_bot_token):
        logger.warning(f"Invalid telegram token format provided by supervisor {supervisor_id}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid Telegram bot token format. Please use the token from BotFather (format: 123456:ABC-DEF1234ghIkl...)",
        )

    try:
        # Prepare webhook_configs
        webhook_configs = request.webhook_configs or {}

        # Sync legacy telegram_bot_token from webhook_configs if missing
        if not request.telegram_bot_token or request.telegram_bot_token == "{}":
            tg_token = webhook_configs.get("telegram", {}).get("bot_token")
            if tg_token and tg_token != "{}":
                request.telegram_bot_token = tg_token
        
        # If using the legacy telegram_bot_token field, merge it into webhook_configs
        if request.telegram_bot_token and request.telegram_bot_token.strip() != "{}":
            if "telegram" not in webhook_configs:
                webhook_configs["telegram"] = {}
            webhook_configs["telegram"]["bot_token"] = request.telegram_bot_token.strip()
            webhook_configs["telegram"]["enabled"] = True
        elif "telegram" in webhook_configs:
             # Ensure it's disabled if no valid token
             if not webhook_configs["telegram"].get("bot_token") or webhook_configs["telegram"].get("bot_token") == "{}":
                 webhook_configs["telegram"]["enabled"] = False
        
        created_agent = agent_repository.create_agent(
            supervisor_id=supervisor_id,
            name=request.name,
            system_prompt=request.system_prompt,
            mcp_tools=request.mcp_tools,
            telegram_bot_token=request.telegram_bot_token.strip() if request.telegram_bot_token and request.telegram_bot_token != "{}" else "{}",
            webhook_configs=webhook_configs,
            agent_type=agent_type,
            status=request.status or AgentStatus.IDLE,
        )
        
        if request.telegram_bot_token or (webhook_configs.get("telegram", {}).get("enabled")):
            logger.info(f"✅ Agent {created_agent.id} created with Telegram integration enabled")
        
        return created_agent
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating agent: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An internal database error occurred while creating the agent.",
        )


def get_agent(
    agent_id: UUID,
    supervisor_id: UUID,
    *,
    allowed_agent_type: AgentType | None = None,
) -> AgentModel:
    """
    Get agent details by ID with ownership check.
    """
    agent = agent_repository.get_by_id(agent_id)

    if agent is None:
        raise NotFoundException("Agent not found")

    if agent.supervisor_id != supervisor_id:
        raise ForbiddenException("You do not have permission to access this agent")

    if allowed_agent_type is not None and agent.agent_type != allowed_agent_type:
        raise ForbiddenException(
            f"You do not have permission to access {agent.agent_type.value} agents"
        )

    return agent


def get_agent_detail(
    agent_id: UUID,
    supervisor_id: UUID,
    *,
    allowed_agent_type: AgentType | None = None,
) -> dict:
    """
    Get detailed agent information.
    """
    agent = get_agent(
        agent_id, supervisor_id, allowed_agent_type=allowed_agent_type
    )

    current_interaction = None
    if agent.status in [AgentStatus.IN_CALL, AgentStatus.IN_CHAT]:
        current_interaction = agent_repository.get_current_interaction(agent_id)

    analytics = agent_repository.get_agent_analytics(agent_id)

    return {
        **agent.model_dump(),
        "current_interaction": current_interaction,
        "analytics": analytics,
    }


def get_agent_status(
    agent_id: UUID,
    supervisor_id: UUID,
    *,
    allowed_agent_type: AgentType | None = None,
) -> dict:
    """
    Get agent's current status and real-time metrics.
    """
    agent = get_agent(
        agent_id, supervisor_id, allowed_agent_type=allowed_agent_type
    )

    current_interaction = None
    realtime_metrics = None

    if agent.status in [AgentStatus.IN_CALL, AgentStatus.IN_CHAT]:
        current_interaction = agent_repository.get_current_interaction(agent_id)
        if current_interaction:
            realtime_metrics = agent_repository.get_latest_metrics(
                UUID(current_interaction["id"])
            )

    return {
        "agent_id": agent.id,
        "status": agent.status,
        "current_interaction": current_interaction,
        "realtime_metrics": realtime_metrics,
    }


def update_agent(
    agent_id: UUID,
    supervisor_id: UUID,
    request: UpdateAgentRequest,
    *,
    allowed_agent_type: AgentType | None = None,
) -> AgentModel:
    """
    Update an agent's configuration.
    """
    agent = get_agent(
        agent_id, supervisor_id, allowed_agent_type=allowed_agent_type
    )

    if request.agent_type is not None:
        if allowed_agent_type is not None and request.agent_type != allowed_agent_type:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot change agent type to '{request.agent_type.value}'",
            )
        if request.agent_type != agent.agent_type:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Agent channel type cannot be changed after creation",
            )

    status_only = _is_status_only_update(request)
    if agent.status == AgentStatus.IN_CALL and not status_only:
        raise AgentBusyException("Cannot update agent while in active call")
    if agent.status == AgentStatus.IN_CHAT and not status_only:
        raise AgentBusyException("Cannot update agent while in active chat")

    # Validate Telegram token if provided
    if request.telegram_bot_token and not validate_telegram_token(request.telegram_bot_token):
        logger.warning(f"Invalid telegram token format provided by supervisor {supervisor_id}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid Telegram bot token format. Please use the token from BotFather (format: 123456:ABC-DEF1234ghIkl...)",
        )

    # Ensure telegram_bot_token and webhook_configs stay in sync
    webhook_configs = request.webhook_configs or agent.webhook_configs or {}
    tg_conf = webhook_configs.get("telegram", {})
    
    if request.telegram_bot_token and request.telegram_bot_token != "{}":
        # Sync from request to webhook_configs
        if "telegram" not in webhook_configs:
            webhook_configs["telegram"] = {}
        webhook_configs["telegram"]["bot_token"] = request.telegram_bot_token.strip()
        webhook_configs["telegram"]["enabled"] = True
    elif tg_conf.get("bot_token") and tg_conf.get("bot_token") != "{}":
        # Sync from webhook_configs to request
        request.telegram_bot_token = tg_conf.get("bot_token").strip()
    else:
        request.telegram_bot_token = "{}"
        if "telegram" in webhook_configs:
            webhook_configs["telegram"]["enabled"] = False
            webhook_configs["telegram"]["bot_token"] = "{}"
        
    # Update the request to include the unified webhook_configs
    request.webhook_configs = webhook_configs
    
    # Log the update for debugging
    logger.info(f"🚀 Sending update to database for agent {agent_id}. Token starts with: {str(request.telegram_bot_token)[:10] if request.telegram_bot_token else 'None'}")
    
    try:
        updated_agent = agent_repository.update(agent_id, request)
    except Exception as e:
        logger.error(f"❌ Database error updating agent {agent_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal database error: {str(e)}",
        )

    return updated_agent


async def delete_agent(
    agent_id: UUID,
    supervisor_id: UUID,
    *,
    allowed_agent_type: AgentType | None = None,
) -> None:
    """
    Delete an agent and cascade-delete its interaction history.

    Interactions use ON DELETE RESTRICT on ``agent_id``, so child rows
    (chat messages, archives, metrics) are removed first via interaction delete.
    """
    agent = get_agent(
        agent_id, supervisor_id, allowed_agent_type=allowed_agent_type
    )

    if agent.status == AgentStatus.IN_CALL:
        raise AgentBusyException(
            "Cannot delete agent during an active voice call. End the call first."
        )

    # Clear in-memory chats and mark stale DB rows completed (common after restarts)
    if agent.status in (AgentStatus.IN_CHAT, AgentStatus.IDLE, AgentStatus.PAUSED):
        await release_agent_from_active_chats(agent_id)

    supabase_admin = get_supabase_service_client()

    active_result = (
        supabase_admin.table("interactions")
        .select("id")
        .eq("agent_id", str(agent_id))
        .eq("status", InteractionStatus.ACTIVE.value)
        .execute()
    )
    if active_result.data:
        raise AgentBusyException(
            "Cannot delete agent while an interaction is still active. "
            "End the call or chat from the dashboard, then try again."
        )

    token = (agent.telegram_bot_token or "").strip()
    if token and token != "{}":
        try:
            await TelegramWebhookService.delete_webhook(token)
        except Exception as e:
            logger.warning("Failed to delete Telegram webhook for agent %s: %s", agent_id, e)

    try:
        # Remove historical interactions first (archives cascade via FK)
        supabase_admin.table("interactions").delete().eq("agent_id", str(agent_id)).execute()
        agent_repository.delete(agent_id)
    except NotFoundException:
        raise
    except AgentBusyException:
        raise
    except Exception as e:
        logger.error(f"Error deleting agent: {e}")
        error_msg = str(e).lower()
        if "foreign key constraint" in error_msg or "violates foreign key" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    "Cannot delete agent because related records could not be removed. "
                    "Try again after ending any active session, or contact support if this persists."
                ),
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An internal database error occurred while deleting the agent.",
        )


async def update_agent_with_telegram_webhook(
    agent_id: UUID,
    supervisor_id: UUID,
    request: UpdateAgentRequest,
    *,
    allowed_agent_type: AgentType | None = None,
) -> tuple[AgentModel, bool]:
    """
    Update an agent's configuration and automatically set up Telegram webhook if token is provided.
    
    Returns:
        Tuple of (updated_agent, webhook_set_successfully)
    """
    agent = get_agent(
        agent_id, supervisor_id, allowed_agent_type=allowed_agent_type
    )
    if (
        _is_status_only_update(request)
        and request.status in (AgentStatus.PAUSED, AgentStatus.IDLE)
        and agent.status == AgentStatus.IN_CHAT
    ):
        await release_agent_from_active_chats(agent_id)

    # First, update the agent normally
    updated_agent = update_agent(
        agent_id,
        supervisor_id,
        request,
        allowed_agent_type=allowed_agent_type,
    )
    
    # If Telegram token was provided, automatically set up the webhook
    webhook_set = False
    if request.telegram_bot_token:
        try:
            logger.info(f"🔄 Automatically setting up Telegram webhook for agent {agent_id}...")
            webhook_set = await TelegramWebhookService.set_webhook(
                request.telegram_bot_token.strip(),
                agent_id
            )
            
            if webhook_set:
                logger.info(f"✅ Telegram webhook automatically configured for agent {agent_id}")
            else:
                logger.warning(f"⚠️  Failed to auto-configure Telegram webhook for agent {agent_id}")
                logger.warning(f"   Agent is still configured, but you may need to set webhook manually:")
                webhook_url = TelegramWebhookService.get_webhook_url(agent_id)
                if webhook_url:
                    logger.warning(f"   {webhook_url}")
        except Exception as e:
            logger.error(f"⚠️  Error setting up Telegram webhook: {e}")
            logger.warning(f"   Agent is configured but webhook may need manual setup")
    
    return updated_agent, webhook_set


async def create_agent_with_telegram_webhook(
    supervisor_id: UUID,
    request: CreateAgentRequest,
    agent_type: AgentType = AgentType.VOICE,
) -> tuple[AgentModel, bool]:
    """
    Create a new agent and automatically set up Telegram webhook if token is provided.
    
    Returns:
        Tuple of (created_agent, webhook_set_successfully)
    """
    # First, create the agent normally
    created_agent = create_agent(supervisor_id, request, agent_type)
    
    # If Telegram token was provided, automatically set up the webhook
    webhook_set = False
    if request.telegram_bot_token:
        try:
            logger.info(f"🔄 Automatically setting up Telegram webhook for new agent {created_agent.id}...")
            webhook_set = await TelegramWebhookService.set_webhook(
                request.telegram_bot_token.strip(),
                created_agent.id
            )
            
            if webhook_set:
                logger.info(f"✅ Telegram webhook automatically configured for new agent {created_agent.id}")
            else:
                logger.warning(f"⚠️  Failed to auto-configure Telegram webhook for agent {created_agent.id}")
                logger.warning(f"   Agent is still configured, but you may need to set webhook manually:")
                webhook_url = TelegramWebhookService.get_webhook_url(created_agent.id)
                if webhook_url:
                    logger.warning(f"   {webhook_url}")
        except Exception as e:
            logger.error(f"⚠️  Error setting up Telegram webhook: {e}")
            logger.warning(f"   Agent is configured but webhook may need manual setup")
    
    return created_agent, webhook_set

