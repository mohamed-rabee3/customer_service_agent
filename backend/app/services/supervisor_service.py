"""Supervisor service - Business logic layer for supervisor operations."""

from uuid import UUID

from fastapi import HTTPException, status

from app.core.constants import SupervisorType, UserRole
from app.core.exceptions import ForbiddenException, NotFoundException
from app.repositories.supervisor_repository import SupervisorModel, supervisor_repository


def get_supervisor_dashboard(supervisor_id: UUID) -> dict:
    """
    Get dashboard data for a supervisor.
    """
    # Verify supervisor exists
    supervisor = supervisor_repository.get_by_id(supervisor_id)
    if supervisor is None:
        raise NotFoundException("Supervisor not found")

    # Get aggregated dashboard data efficiently
    enriched_agents = supervisor_repository.get_dashboard_data(supervisor_id)

    return {
        "agents": enriched_agents,
        "total": len(enriched_agents),
    }


def list_supervisors(
    page: int = 1,
    limit: int = 20,
    supervisor_type: SupervisorType | None = None,
) -> dict:
    """
    List all supervisors with pagination (Admin only).
    """
    skip = (page - 1) * limit

    supervisors, total = supervisor_repository.get_all_supervisors(
        skip=skip,
        limit=limit,
        supervisor_type=supervisor_type,
    )

    return {
        "supervisors": [
            {
                "id": s.id,
                "name": s.name or "",
                "supervisor_type": s.supervisor_type,
                "performance_score": s.performance_score,
                "total_interactions": s.total_interactions,
                "created_at": s.created_at,
                "updated_at": s.updated_at,
            }
            for s in supervisors
        ],
        "total": total,
        "page": page,
        "limit": limit,
    }


def get_supervisor_detail(
    supervisor_id: UUID,
    current_user_id: UUID,
    current_user_role: UserRole,
) -> dict:
    """
    Get detailed supervisor information.
    """
    # Authorization check
    if current_user_role != UserRole.ADMIN and current_user_id != supervisor_id:
        raise ForbiddenException("You do not have permission to view this supervisor")

    supervisor = supervisor_repository.get_by_id(supervisor_id)
    if supervisor is None:
        raise NotFoundException("Supervisor not found")

    # Reuse aggregation for consistent agent data view
    agents = supervisor_repository.get_dashboard_data(supervisor_id)
    recent_interactions = supervisor_repository.get_recent_interactions(
        supervisor_id, limit=10
    )

    return {
        "id": supervisor.id,
        "name": supervisor.name or "",
        "supervisor_type": supervisor.supervisor_type,
        "performance_score": supervisor.performance_score,
        "total_interactions": supervisor.total_interactions,
        "created_at": supervisor.created_at,
        "updated_at": supervisor.updated_at,
        "agents": agents,
        "recent_interactions": recent_interactions,
    }
