"""Agent API endpoints."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends

from app.api.deps import get_current_user
from app.api.v1.schemas.agent import (
    AgentDetailResponse,
    AgentResponse,
    AgentStatusResponse,
    CreateAgentRequest,
    UpdateAgentRequest,
    WhisperRequest,
    WhisperResponse,
)
from app.api.v1.schemas.auth import UserResponse
from app.core.constants import UserRole
from app.core.exceptions import ForbiddenException
from app.services.agent_service import AgentService, CreateAgentData, UpdateAgentData
from app.services.whisper_service import WhisperService

router = APIRouter(prefix="/agents", tags=["Agents"])


def _require_supervisor(user: UserResponse) -> UserResponse:
    """Ensure user is a supervisor."""
    if user.role != UserRole.SUPERVISOR:
        raise ForbiddenException("Only supervisors can manage agents")
    return user


@router.post("", response_model=AgentResponse, status_code=201)
def create_agent(
    body: CreateAgentRequest,
    current_user: Annotated[UserResponse, Depends(get_current_user)],
):
    """Create a new agent for the current supervisor."""
    user = _require_supervisor(current_user)
    service = AgentService()

    agent = service.create_agent(
        supervisor_id=user.id,
        agent_type=user.profile.supervisor_type,
        data=CreateAgentData(
            name=body.name,
            system_prompt=body.system_prompt,
            mcp_tools=body.mcp_tools,
        ),
    )

    return AgentResponse(
        id=agent.id,
        name=agent.name,
        agent_type=agent.agent_type.value,
        status=agent.status.value,
        tools=list(agent.mcp_tools.get("tools", {}).keys()) if agent.mcp_tools else [],
        created_at=agent.created_at,
    )


@router.get("/{agent_id}", response_model=AgentDetailResponse)
def get_agent(
    agent_id: UUID,
    current_user: Annotated[UserResponse, Depends(get_current_user)],
):
    """Get agent details (owner supervisor only)."""
    user = _require_supervisor(current_user)
    service = AgentService()
    detail = service.get_agent_detail(agent_id, user.id)
    agent = detail["agent"]
    interaction = detail["current_interaction"]

    return AgentDetailResponse(
        id=agent.id,
        name=agent.name,
        agent_type=agent.agent_type.value,
        status=agent.status.value,
        system_prompt=agent.system_prompt,
        mcp_tools=agent.mcp_tools,
        tools=list(agent.mcp_tools.get("tools", {}).keys()) if agent.mcp_tools else [],
        created_at=agent.created_at,
        current_interaction={
            "id": str(interaction.id),
            "status": interaction.status.value,
            "started_at": interaction.started_at.isoformat(),
        }
        if interaction
        else None,
    )


@router.put("/{agent_id}", response_model=AgentResponse)
def update_agent(
    agent_id: UUID,
    body: UpdateAgentRequest,
    current_user: Annotated[UserResponse, Depends(get_current_user)],
):
    """Update agent configuration (owner supervisor, idle only)."""
    user = _require_supervisor(current_user)
    service = AgentService()

    agent = service.update_agent(
        agent_id=agent_id,
        supervisor_id=user.id,
        data=UpdateAgentData(
            name=body.name,
            system_prompt=body.system_prompt,
            mcp_tools=body.mcp_tools,
        ),
    )

    return AgentResponse(
        id=agent.id,
        name=agent.name,
        agent_type=agent.agent_type.value,
        status=agent.status.value,
        tools=list(agent.mcp_tools.get("tools", {}).keys()) if agent.mcp_tools else [],
        created_at=agent.created_at,
    )


@router.delete("/{agent_id}", status_code=204)
def delete_agent(
    agent_id: UUID,
    current_user: Annotated[UserResponse, Depends(get_current_user)],
):
    """Delete an agent (owner supervisor, idle only)."""
    user = _require_supervisor(current_user)
    service = AgentService()
    service.delete_agent(agent_id, user.id)


@router.get("/{agent_id}/status", response_model=AgentStatusResponse)
def get_agent_status(
    agent_id: UUID,
    current_user: Annotated[UserResponse, Depends(get_current_user)],
):
    """Get agent current status with live metrics."""
    user = _require_supervisor(current_user)
    service = AgentService()
    result = service.get_agent_status(agent_id, user.id)
    interaction = result["current_interaction"]

    return AgentStatusResponse(
        agent_id=result["agent_id"],
        status=result["status"].value,
        current_interaction={
            "id": str(interaction.id),
            "status": interaction.status.value,
            "started_at": interaction.started_at.isoformat(),
            "phone_number": interaction.phone_number,
        }
        if interaction
        else None,
        realtime_metrics=result["realtime_metrics"],
    )


@router.post("/{agent_id}/whisper", response_model=WhisperResponse)
async def send_whisper(
    agent_id: UUID,
    body: WhisperRequest,
    current_user: Annotated[UserResponse, Depends(get_current_user)],
):
    """Send whisper instructions to an agent during an active interaction."""
    user = _require_supervisor(current_user)
    service = WhisperService()

    result = await service.send_whisper(
        agent_id=agent_id,
        supervisor_id=user.id,
        instructions=body.instructions,
    )

    return WhisperResponse(**result)
