"""Agent endpoints - Router layer for agent API."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, status

from app.api.v1.schemas.agent import (
    AgentCreateResponse,
    AgentDetailResponse,
    AgentResponse,
    AgentStatusResponse,
    CreateAgentRequest,
    UpdateAgentRequest,
)
from app.api.v1.schemas.auth import UserResponse
from app.core.constants import AgentType
from app.core.security import get_current_user
from app.services import agent_service

router = APIRouter(prefix="/agents", tags=["Agents"])


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

    Raises:
        400: Maximum 3 agents allowed per supervisor
        401: Not authenticated
    """
    agent_type = AgentType.VOICE
    if hasattr(current_user.profile, "supervisor_type"):
        agent_type = AgentType(current_user.profile.supervisor_type.value)

    created_agent = agent_service.create_agent(
        supervisor_id=current_user.id,
        request=request,
        agent_type=agent_type,
    )

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

    Raises:
        401: Not authenticated
        403: Not authorized to update this agent
        404: Agent not found
        409: Cannot update agent while in active call/chat
    """
    updated_agent = agent_service.update_agent(
        agent_id=agent_id,
        supervisor_id=current_user.id,
        request=request,
    )

    return AgentResponse.model_validate(updated_agent.model_dump())


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
        409: Cannot delete agent while in active call/chat
    """
    agent_service.delete_agent(
        agent_id=agent_id,
        supervisor_id=current_user.id,
    )
