"""Tool permission service with business logic."""

import logging
from uuid import UUID

from app.core.constants import ToolPermissionStatus
from app.core.exceptions import NotFoundException, ValidationException
from app.repositories.tool_permission_repository import ToolPermissionRepository

logger = logging.getLogger(__name__)


class ToolService:
    """Service for tool permission management."""

    def __init__(self):
        self.permission_repo = ToolPermissionRepository()

    def respond_to_permission(
        self,
        permission_id: UUID,
        response: str,
    ):
        """
        Respond to a tool permission request.

        Args:
            permission_id: ID of the permission to respond to
            response: "allowed" or "denied"

        Returns:
            Updated permission record
        """
        # Validate the permission exists and is pending
        permission = self.permission_repo.get_pending_by_id(permission_id)
        if not permission:
            # Check if it exists but is not pending (could be timed out)
            existing = self.permission_repo.get_by_id(permission_id)
            if not existing:
                raise NotFoundException(f"Permission {permission_id} not found")
            if existing.status == ToolPermissionStatus.EXPIRED:
                raise ValidationException("Permission request has timed out")
            raise ValidationException(
                f"Permission is already {existing.status.value}"
            )

        # Map response to status
        status = (
            ToolPermissionStatus.ALLOWED
            if response == "allowed"
            else ToolPermissionStatus.DENIED
        )

        updated = self.permission_repo.update_response(
            permission_id=permission_id,
            supervisor_response=response,
            status=status,
        )

        logger.info(
            f"Permission {permission_id} responded with '{response}'"
        )

        return updated

    def get_permissions_by_interaction(self, interaction_id: UUID):
        """Get all tool permissions for an interaction."""
        return self.permission_repo.get_by_interaction(interaction_id)
