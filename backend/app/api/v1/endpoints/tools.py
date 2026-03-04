"""Tool permission endpoints."""

from fastapi import APIRouter, Depends, HTTPException, status
from uuid import UUID
from app.api.v1.schemas.auth import UserResponse
from app.api.deps import get_current_user
from app.services.tool_service import ToolService
from app.api.v1.schemas.tools import ToolPermissionOut, PermissionRespondIn

router = APIRouter(prefix="/tools", tags=["Tools"])


@router.get("/permissions/interaction/{interaction_id}", response_model=list[ToolPermissionOut])
def get_permissions(
    interaction_id: UUID,
    user: UserResponse = Depends(get_current_user),
):
    """Get tool permissions for a specific interaction."""
    return ToolService().list_interaction_permissions(str(interaction_id), str(user.id))


@router.post("/permissions/{permission_id}/respond", response_model=ToolPermissionOut)
def respond_permission(
    permission_id: UUID,
    body: PermissionRespondIn,
    user: UserResponse = Depends(get_current_user),
):
    """Respond to a tool permission request (allow/deny)."""
    service = ToolService()

    try:
        return service.respond_permission(
            str(permission_id),
            str(user.id),
            body.response,
        )

    except PermissionError:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Forbidden")

    except RuntimeError:
        raise HTTPException(status.HTTP_409_CONFLICT, "Already responded")

    except ValueError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Permission not found")

