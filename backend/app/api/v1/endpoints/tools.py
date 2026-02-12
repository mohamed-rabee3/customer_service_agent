"""Tool permission endpoints."""

from fastapi import APIRouter, Depends, HTTPException, status
from uuid import UUID
from app.api.deps import get_current_user
from app.services.tool_service import ToolService
from app.api.v1.schemas.tools import ToolPermissionOut, PermissionRespondIn

router = APIRouter(prefix="/tools", tags=["Tools"])


# =========================
# GET PERMISSIONS BY INTERACTION
# =========================
@router.get("/permissions/interaction/{interaction_id}", response_model=list[ToolPermissionOut])
def get_permissions(interaction_id: UUID, user=Depends(get_current_user)):
    return ToolService().list_interaction_permissions(str(interaction_id), user["id"])


# =========================
# RESPOND TO PERMISSION
# =========================
@router.post("/permissions/{permission_id}/respond", response_model=ToolPermissionOut)
def respond_permission(
    permission_id: UUID,
    body: PermissionRespondIn,
    user=Depends(get_current_user)
):
    service = ToolService()

    try:
        return service.respond_permission(
            str(permission_id),
            user["id"],
            body.response
        )

    except PermissionError:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Forbidden")

    except RuntimeError:
        raise HTTPException(status.HTTP_409_CONFLICT, "Already responded")

    except ValueError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Permission not found")
