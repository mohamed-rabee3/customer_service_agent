"""Tool permission API endpoints."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends

from app.api.deps import get_current_user
from app.api.v1.schemas.auth import UserResponse
from app.api.v1.schemas.tools import (
    PermissionRespondRequest,
    PermissionRespondResponse,
    ToolPermissionItem,
)
from app.core.constants import UserRole
from app.core.exceptions import ForbiddenException
from app.services.tool_service import ToolService

router = APIRouter(prefix="/tools", tags=["Tool Permissions"])


@router.post(
    "/permissions/{permission_id}/respond",
    response_model=PermissionRespondResponse,
)
def respond_to_permission(
    permission_id: UUID,
    body: PermissionRespondRequest,
    current_user: Annotated[UserResponse, Depends(get_current_user)],
):
    """Respond to a tool permission request (allow or deny)."""
    if current_user.role != UserRole.SUPERVISOR:
        raise ForbiddenException("Only supervisors can respond to permissions")

    service = ToolService()
    updated = service.respond_to_permission(
        permission_id=permission_id,
        response=body.response,
    )

    return PermissionRespondResponse(
        permission_id=updated.id,
        response=updated.supervisor_response or body.response,
        responded_at=updated.responded_at,
    )


@router.get(
    "/permissions/interaction/{interaction_id}",
    response_model=list[ToolPermissionItem],
)
def get_permissions_by_interaction(
    interaction_id: UUID,
    current_user: Annotated[UserResponse, Depends(get_current_user)],
):
    """Get all tool permissions for a specific interaction."""
    if current_user.role != UserRole.SUPERVISOR:
        raise ForbiddenException("Only supervisors can view permissions")

    service = ToolService()
    permissions = service.get_permissions_by_interaction(interaction_id)

    return [
        ToolPermissionItem(
            id=p.id,
            interaction_id=p.interaction_id,
            tool_name=p.tool_name,
            status=p.status.value,
            supervisor_response=p.supervisor_response,
            responded_at=p.responded_at,
        )
        for p in permissions
    ]
