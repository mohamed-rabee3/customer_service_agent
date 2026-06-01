"""Agent endpoints - Router layer for agent API."""

from typing import Annotated, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status

from app.api.v1.schemas.agent import (
    AgentCreateResponse,
    AgentDetailResponse,
    AgentResponse,
    AgentStatusResponse,
    AgentWhisperRequest,
    AgentWhisperResponse,
    CreateAgentRequest,
    UpdateAgentRequest,
)
from app.services.whisper_service import WhisperService
from app.api.v1.schemas.auth import UserResponse
from app.core.constants import AgentType
from app.core.security import get_current_user
from app.services import agent_service

router = APIRouter(prefix="/agents", tags=["Agents"])


@router.get(
    "",
    response_model=list[AgentResponse],
    summary="List agents",
    description="List all agents for the current supervisor. Admins see all agents. Optionally filter by type.",
)
async def list_agents(
    current_user: Annotated[UserResponse, Depends(get_current_user)],
    agent_type: Optional[str] = Query(None, description="Filter by agent type: 'voice' or 'chat'"),
) -> list[AgentResponse]:
    """
    List all agents belonging to the current supervisor.

    Raises:
        401: Not authenticated
    """
    agents = agent_service.list_agents(
        supervisor_id=current_user.id,
        role=current_user.role,
        agent_type=agent_type,
    )
    return [AgentResponse.model_validate(a.model_dump()) for a in agents]


@router.post(
    "",
    response_model=AgentCreateResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create agent",
    description="Create a new AI agent. Maximum 3 agents per supervisor.",
)
async def create_agent(
    request: CreateAgentRequest,
    current_user: Annotated[UserResponse, Depends(get_current_user)],
) -> AgentCreateResponse:
    """
    Create a new AI agent for the current supervisor.
    
    If a Telegram token is provided, the webhook will be automatically configured.

    Raises:
        400: Maximum 3 agents allowed per supervisor
        401: Not authenticated
    """
    agent_type = AgentType.VOICE
    if request.agent_type:
        agent_type = request.agent_type
    elif hasattr(current_user.profile, "supervisor_type"):
        agent_type = AgentType(current_user.profile.supervisor_type.value)

    created_agent, webhook_set = await agent_service.create_agent_with_telegram_webhook(
        supervisor_id=current_user.id,
        request=request,
        agent_type=agent_type,
    )
    
    # Log the webhook setup status
    if request.telegram_bot_token and webhook_set:
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"✅ Agent {created_agent.id} created with Telegram token and webhook auto-configured")

    return AgentCreateResponse.model_validate(created_agent.model_dump())


@router.get(
    "/{agent_id}",
    response_model=AgentDetailResponse,
    summary="Get agent details",
    description="Get detailed information about a specific agent.",
)
async def get_agent(
    agent_id: UUID,
    current_user: Annotated[UserResponse, Depends(get_current_user)],
) -> AgentDetailResponse:
    """
    Get detailed agent information including current interaction and analytics.

    Raises:
        401: Not authenticated
        403: Not authorized to access this agent
        404: Agent not found
    """
    agent_detail = agent_service.get_agent_detail(
        agent_id=agent_id,
        supervisor_id=current_user.id,
    )

    return AgentDetailResponse.model_validate(agent_detail)


@router.get(
    "/{agent_id}/status",
    response_model=AgentStatusResponse,
    summary="Get agent current status",
    description="Get real-time agent status and current interaction.",
)
async def get_agent_status(
    agent_id: UUID,
    current_user: Annotated[UserResponse, Depends(get_current_user)],
) -> AgentStatusResponse:
    """
    Get agent's current status and real-time metrics.

    Raises:
        401: Not authenticated
        403: Not authorized to access this agent
        404: Agent not found
    """
    status_data = agent_service.get_agent_status(
        agent_id=agent_id,
        supervisor_id=current_user.id,
    )

    return AgentStatusResponse.model_validate(status_data)


@router.put(
    "/{agent_id}",
    response_model=AgentResponse,
    summary="Update agent",
    description="Update agent configuration. Only allowed when agent is idle or paused.",
)
async def update_agent(
    agent_id: UUID,
    request: UpdateAgentRequest,
    current_user: Annotated[UserResponse, Depends(get_current_user)],
) -> AgentResponse:
    """
    Update an agent's configuration (partial update).
    
    If a Telegram token is provided, the webhook will be automatically configured.

    Raises:
        401: Not authenticated
        403: Not authorized to update this agent
        404: Agent not found
        409: Cannot update agent while in active call/chat
    """
    updated_agent, webhook_set = await agent_service.update_agent_with_telegram_webhook(
        agent_id=agent_id,
        supervisor_id=current_user.id,
        request=request,
    )
    
    response = AgentResponse.model_validate(updated_agent.model_dump())
    
    # Log the webhook setup status
    if request.telegram_bot_token and webhook_set:
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"✅ Agent {agent_id} updated with Telegram token and webhook auto-configured")
    
    return response


@router.post(
    "/{agent_id}/whisper",
    response_model=AgentWhisperResponse,
    summary="Inject supervisor instruction (voice)",
    description=(
        "Send whisper instructions to an agent during an active call or chat. "
        "Pauses the agent and delivers the instruction via LiveKit data channel."
    ),
)
async def whisper_to_agent(
    agent_id: UUID,
    request: AgentWhisperRequest,
    current_user: Annotated[UserResponse, Depends(get_current_user)],
) -> AgentWhisperResponse:
    """Inject a supervisor whisper into an active voice or chat interaction."""
    service = WhisperService()
    result = await service.send_whisper(
        agent_id=agent_id,
        supervisor_id=current_user.id,
        instructions=request.instructions,
    )
    return AgentWhisperResponse.model_validate(result)


@router.delete(
    "/{agent_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete agent",
    description="Delete an agent. Only allowed when agent is idle or paused.",
)
async def delete_agent(
    agent_id: UUID,
    current_user: Annotated[UserResponse, Depends(get_current_user)],
) -> None:
    """
    Delete an agent.

    Raises:
        401: Not authenticated
        403: Not authorized to delete this agent
        404: Agent not found
        409: Cannot delete agent while in active voice call
    """
    await agent_service.delete_agent(
        agent_id=agent_id,
        supervisor_id=current_user.id,
    )
