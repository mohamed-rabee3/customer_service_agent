"""Supervisor endpoints - Router layer for supervisor API (Moaz's endpoints)."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.api.v1.schemas.auth import UserResponse
from app.api.v1.schemas.supervisor import (
    SupervisorDashboardResponse,
    SupervisorDetailResponse,
    SupervisorListResponse,
)
from app.core.constants import SupervisorType, UserRole
from app.core.security import get_current_user
from app.services import supervisor_service

router = APIRouter(prefix="/supervisors", tags=["Supervisors"])


def require_admin(current_user: UserResponse) -> UserResponse:
    """Check if user is admin, raise 403 if not."""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return current_user


@router.get(
    "/me/dashboard",
    response_model=SupervisorDashboardResponse,
    summary="Get supervisor dashboard data",
    description="Get all agents with current state, interactions, and real-time metrics.",
)
async def get_supervisor_dashboard(
    current_user: Annotated[UserResponse, Depends(get_current_user)],
) -> SupervisorDashboardResponse:
    """
    Get dashboard data for the current supervisor.

    Returns all agents (max 3) with:
    - Current status
    - Active interaction (if any)
    - Latest real-time metrics (if active)

    Raises:
        401: Not authenticated
        404: Supervisor not found
    """
    dashboard_data = supervisor_service.get_supervisor_dashboard(
        supervisor_id=current_user.id,
    )

    return SupervisorDashboardResponse.model_validate(dashboard_data)


@router.get(
    "",
    response_model=SupervisorListResponse,
    summary="List all supervisors",
    description="Get paginated list of all supervisors. Admin only.",
)
async def list_supervisors(
    current_user: Annotated[UserResponse, Depends(get_current_user)],
    supervisor_type: SupervisorType | None = Query(None, description="Filter by type"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
) -> SupervisorListResponse:
    """
    List all supervisors with pagination (Admin only).

    Raises:
        401: Not authenticated
        403: Admin access required
    """
    require_admin(current_user)

    list_data = supervisor_service.list_supervisors(
        page=page,
        limit=limit,
        supervisor_type=supervisor_type,
    )

    return SupervisorListResponse.model_validate(list_data)


@router.get(
    "/{supervisor_id}",
    response_model=SupervisorDetailResponse,
    summary="Get supervisor details",
    description="Get detailed supervisor info with agents and recent interactions.",
)
async def get_supervisor_detail(
    supervisor_id: UUID,
    current_user: Annotated[UserResponse, Depends(get_current_user)],
) -> SupervisorDetailResponse:
    """
    Get detailed supervisor information.

    Authorization:
    - Admin can view any supervisor
    - Supervisor can only view themselves

    Raises:
        401: Not authenticated
        403: Not authorized to view this supervisor
        404: Supervisor not found
    """
    detail_data = supervisor_service.get_supervisor_detail(
        supervisor_id=supervisor_id,
        current_user_id=current_user.id,
        current_user_role=current_user.role,
    )

    return SupervisorDetailResponse.model_validate(detail_data)
