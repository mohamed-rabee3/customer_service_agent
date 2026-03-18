"""Supervisor endpoints - Router layer for supervisor API."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.api.deps import require_admin
from app.api.v1.schemas.auth import UserResponse
from app.api.v1.schemas.supervisor import (
    SupervisorCreate,
    SupervisorDashboardResponse,
    SupervisorDetailResponse,
    SupervisorListResponse,
    SupervisorResponse,
    SupervisorUpdate,
)
from app.core.constants import SupervisorType, UserRole
from app.core.security import get_current_user
from app.services import supervisor_service

router = APIRouter(prefix="/supervisors", tags=["Supervisors"])


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
    current_user: Annotated[UserResponse, Depends(require_admin)],
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


# ==============================
# Supervisor CRUD (Admin only) — Sundus's endpoints
# ==============================


@router.post(
    "",
    response_model=SupervisorResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new supervisor",
    description="Create a new supervisor with auth user. Admin only.",
)
async def create_supervisor(
    data: SupervisorCreate,
    current_user: Annotated[UserResponse, Depends(require_admin)],
) -> SupervisorResponse:
    """
    Create a new supervisor (Admin only).

    Creates an auth user in Supabase and a supervisor record.

    Raises:
        400: Failed to create auth user
        401: Not authenticated
        403: Admin access required
    """
    result = supervisor_service.create_supervisor(data)
    return SupervisorResponse.model_validate(result)


@router.put(
    "/{supervisor_id}",
    response_model=SupervisorResponse,
    summary="Update supervisor",
    description="Update supervisor fields. Admin only.",
)
async def update_supervisor(
    supervisor_id: UUID,
    data: SupervisorUpdate,
    current_user: Annotated[UserResponse, Depends(require_admin)],
) -> SupervisorResponse:
    """
    Update a supervisor (Admin only).

    Raises:
        400: No fields to update
        401: Not authenticated
        403: Admin access required
        404: Supervisor not found
    """
    result = supervisor_service.update_supervisor(supervisor_id, data)
    return SupervisorResponse.model_validate(result)


@router.delete(
    "/{supervisor_id}",
    status_code=status.HTTP_200_OK,
    summary="Delete supervisor (DANGEROUS)",
    description="Delete supervisor, cascade agents and interactions. Admin only.",
)
async def delete_supervisor(
    supervisor_id: UUID,
    current_user: Annotated[UserResponse, Depends(require_admin)],
):
    """
    Delete a supervisor with cascade (Admin only).

    This is a DANGEROUS operation that:
    1. Checks for active interactions
    2. Deletes all interactions for supervisor's agents
    3. Deletes all agents
    4. Deletes the supervisor record
    5. Deletes the auth user

    Raises:
        401: Not authenticated
        403: Admin access required
        404: Supervisor not found
        409: Cannot delete — has active interactions
    """
    return supervisor_service.delete_supervisor(
        supervisor_id=supervisor_id,
        deleted_by=str(current_user.id),
    )
