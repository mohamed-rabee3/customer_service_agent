"""Interaction API endpoints."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query

from app.api.deps import get_current_user
from app.api.v1.schemas.auth import UserResponse
from app.api.v1.schemas.interaction import (
    CreateInteractionRequest,
    CreateInteractionResponse,
    InteractionDetailResponse,
    InteractionListResponse,
    InteractionResponse,
    UpdateInteractionRequest,
)
from app.api.v1.schemas.agent import AgentResponse
from app.core.constants import AgentStatus, InteractionStatus, InteractionType, UserRole
from app.core.exceptions import ForbiddenException
from app.services.interaction_service import InteractionService

router = APIRouter(prefix="/interactions", tags=["Interactions"])


@router.post("", response_model=CreateInteractionResponse, status_code=201)
async def create_interaction(
    body: CreateInteractionRequest,
):
    """
    Start a new interaction (customer-facing, no auth).

    Creates a LiveKit room, assigns an idle agent whose supervisor is
    actively monitoring (recent GET /supervisors/me/dashboard), and returns
    a token for the customer to join the room.
    """
    service = InteractionService()
    result = await service.create_interaction(
        interaction_type=body.interaction_type,
        phone_number=body.phone_number,
    )
    agent = result["agent"]
    new_status = (
        AgentStatus.IN_CALL
        if body.interaction_type == InteractionType.VOICE
        else AgentStatus.IN_CHAT
    )
    agent_response = AgentResponse.model_validate(agent.model_dump())
    agent_response = agent_response.model_copy(update={"status": new_status})

    return CreateInteractionResponse(
        interaction_id=result["interaction_id"],
        agent=agent_response,
        livekit_token=result["livekit_token"],
        livekit_url=result["livekit_url"],
    )


@router.get("", response_model=InteractionListResponse)
def list_interactions(
    current_user: Annotated[UserResponse, Depends(get_current_user)],
    status: InteractionStatus | None = Query(None, description="Filter by status"),
    agent_id: UUID | None = Query(None, description="Filter by agent ID"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
):
    """List interactions for the supervisor's agents."""
    if current_user.role != UserRole.SUPERVISOR:
        raise ForbiddenException("Only supervisors can view interactions")

    service = InteractionService()
    result = service.list_interactions(
        supervisor_id=current_user.id,
        status=status,
        agent_id=agent_id,
        page=page,
        limit=limit,
    )

    interactions = []
    for i in result["interactions"]:
        duration = None
        if i.end_at and i.started_at:
            duration = int((i.end_at - i.started_at).total_seconds())

        interactions.append(
            InteractionResponse(
                id=i.id,
                agent_id=i.agent_id,
                phone_number=i.phone_number,
                interaction_type=i.interaction_type.value,
                status=i.status.value,
                started_at=i.started_at,
                end_at=i.end_at,
                duration_seconds=duration,
            )
        )

    return InteractionListResponse(
        interactions=interactions,
        total=result["total"],
        page=result["page"],
        limit=result["limit"],
    )


@router.get("/{interaction_id}", response_model=InteractionDetailResponse)
def get_interaction(
    interaction_id: UUID,
    current_user: Annotated[UserResponse, Depends(get_current_user)],
):
    """Get interaction detail with metrics and permissions."""
    if current_user.role != UserRole.SUPERVISOR:
        raise ForbiddenException("Only supervisors can view interactions")

    service = InteractionService()
    result = service.get_interaction_detail(interaction_id)
    i = result["interaction"]
    duration = None
    if i.end_at and i.started_at:
        duration = int((i.end_at - i.started_at).total_seconds())

    return InteractionDetailResponse(
        id=i.id,
        agent_id=i.agent_id,
        phone_number=i.phone_number,
        interaction_type=i.interaction_type.value,
        status=i.status.value,
        started_at=i.started_at,
        end_at=i.end_at,
        duration_seconds=duration,
        call_source_id=i.call_source_id,
        realtime_metrics=result["realtime_metrics"],
        tool_permissions=result["tool_permissions"],
    )


@router.patch("/{interaction_id}", response_model=InteractionResponse)
async def update_interaction(
    interaction_id: UUID,
    body: UpdateInteractionRequest,
    current_user: Annotated[UserResponse, Depends(get_current_user)],
):
    """Update interaction status or phone number."""
    if current_user.role != UserRole.SUPERVISOR:
        raise ForbiddenException("Only supervisors can update interactions")

    service = InteractionService()
    status = InteractionStatus(body.status) if body.status else None
    updated = await service.update_interaction(
        interaction_id=interaction_id,
        status=status,
        phone_number=body.phone_number,
    )

    duration = None
    if updated.end_at and updated.started_at:
        duration = int((updated.end_at - updated.started_at).total_seconds())

    return InteractionResponse(
        id=updated.id,
        agent_id=updated.agent_id,
        phone_number=updated.phone_number,
        interaction_type=updated.interaction_type.value,
        status=updated.status.value,
        started_at=updated.started_at,
        end_at=updated.end_at,
        duration_seconds=duration,
    )
