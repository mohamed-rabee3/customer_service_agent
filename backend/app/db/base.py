"""Base repository generic implementation."""

from typing import Generic, Type, TypeVar, Any
from uuid import UUID
from pydantic import BaseModel
from app.db.supabase import get_supabase_client

ModelType = TypeVar("ModelType", bound=BaseModel)

class BaseRepository(Generic[ModelType]):
    """
    Base repository implementing common CRUD operations.
    """

    def __init__(self, table_name: str, model_class: Type[ModelType]):
        self.table_name = table_name
        self.model_class = model_class
        self.client = get_supabase_client()

    def get_all(self, skip: int = 0, limit: int = 100) -> list[ModelType]:
        """Get all records with pagination."""
        result = (
            self.client.table(self.table_name)
            .select("*")
            .range(skip, skip + limit - 1)
            .execute()
        )
        return [self.model_class.model_validate(item) for item in result.data]

    def get_by_id(self, id: UUID) -> ModelType | None:
        """Get record by ID."""
        result = (
            self.client.table(self.table_name)
            .select("*")
            .eq("id", str(id))
            .limit(1)
            .execute()
        )
        if result.data:
            return self.model_class.model_validate(result.data[0])
        return None

    def create(self, obj_in: BaseModel | dict[str, Any]) -> ModelType:
        """Create a new record."""
        if isinstance(obj_in, BaseModel):
            data = obj_in.model_dump(exclude_none=True)
        else:
            data = obj_in

        result = self.client.table(self.table_name).insert(data).execute()
        
        if result.data:
            return self.model_class.model_validate(result.data[0])
        raise Exception("Failed to create record")

    def update(self, id: UUID, obj_in: BaseModel | dict[str, Any]) -> ModelType | None:
        """Update a record."""
        if isinstance(obj_in, BaseModel):
            data = obj_in.model_dump(exclude_none=True)
        else:
            data = obj_in

        result = (
            self.client.table(self.table_name)
            .update(data)
            .eq("id", str(id))
            .execute()
        )
        if result.data:
            return self.model_class.model_validate(result.data[0])
        return None

    def delete(self, id: UUID) -> bool:
        """Delete a record."""
        result = (
            self.client.table(self.table_name)
            .delete()
            .eq("id", str(id))
            .execute()
        )
        return len(result.data) > 0
