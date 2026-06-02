"""Voice vs chat supervisor scoping helpers."""

from uuid import UUID

from fastapi import HTTPException, status

from app.api.v1.schemas.auth import SupervisorProfile, UserResponse
from app.core.constants import AgentType, UserRole
from app.core.exceptions import NotFoundException
from app.repositories.supervisor_repository import supervisor_repository


def agent_type_for_supervisor_id(supervisor_id: UUID) -> AgentType:
    """Resolve allowed agent/interaction type from the supervisors table."""
    supervisor = supervisor_repository.get_by_id(supervisor_id)
    if supervisor is None:
        raise NotFoundException("Supervisor not found")
    return AgentType(supervisor.supervisor_type.value)


def agent_type_for_user(user: UserResponse) -> AgentType | None:
    """Supervisors are limited to one channel; admins are unrestricted."""
    if user.role == UserRole.ADMIN:
        return None
    if isinstance(user.profile, SupervisorProfile):
        return AgentType(user.profile.supervisor_type.value)
    return None


def require_matching_agent_type(
    requested: AgentType | None,
    allowed: AgentType,
) -> AgentType:
    """
    Enforce that supervisors only create/manage agents of their channel type.

    Returns the resolved agent type to persist.
    """
    if requested is not None and requested != allowed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Supervisors with type '{allowed.value}' cannot create or modify '{requested.value}' agents",
        )
    return allowed
