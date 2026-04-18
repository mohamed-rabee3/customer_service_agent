"""Tool permission repository for database operations."""

from uuid import UUID

from app.core.constants import ToolPermissionStatus
from app.models.tool_permission import ToolPermission
from app.repositories.base import BaseRepository


class ToolPermissionRepository(BaseRepository[ToolPermission]):
    """Repository for tool permission CRUD and query operations."""

    def __init__(self):
        super().__init__(table_name="tool_permissions", model_class=ToolPermission)

    def get_by_interaction(self, interaction_id: UUID) -> list[ToolPermission]:
        """Get all tool permissions for an interaction."""
        try:
            response = (
                self.client.table(self.table_name)
                .select("*")
                .eq("interaction_id", str(interaction_id))
                .order("id", desc=False)
                .execute()
            )
            return [self.model_class.model_validate(item) for item in response.data]
        except Exception as e:
            raise Exception(
                f"Failed to fetch permissions for interaction {interaction_id}: {e}"
            ) from e

    def get_pending_by_id(self, permission_id: UUID) -> ToolPermission | None:
        """Get a pending permission by ID (for supervisor response)."""
        try:
            response = (
                self.client.table(self.table_name)
                .select("*")
                .eq("id", str(permission_id))
                .eq("status", ToolPermissionStatus.PENDING.value)
                .limit(1)
                .execute()
            )
            if not response.data:
                return None
            return self.model_class.model_validate(response.data[0])
        except Exception as e:
            raise Exception(f"Failed to fetch pending permission {permission_id}: {e}") from e

    def update_response(
        self,
        permission_id: UUID,
        supervisor_response: str,
        status: ToolPermissionStatus,
    ) -> ToolPermission:
        """Update a permission with supervisor response."""
        from datetime import datetime, timezone

        try:
            response = (
                self.client.table(self.table_name)
                .update({
                    "supervisor_response": supervisor_response,
                    "status": status.value,
                    "responded_at": datetime.now(timezone.utc).isoformat(),
                })
                .eq("id", str(permission_id))
                .execute()
            )
            if not response.data:
                raise Exception(f"Permission {permission_id} not found")
            return self.model_class.model_validate(response.data[0])
        except Exception as e:
            raise Exception(f"Failed to update permission {permission_id}: {e}") from e
