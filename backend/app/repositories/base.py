"""Generic base repository for CRUD operations using Supabase."""

from typing import Generic, TypeVar
from uuid import UUID

from pydantic import BaseModel
from supabase import Client

from app.core.exceptions import NotFoundException
from app.db.supabase import get_supabase_client

# Type variable for Pydantic models
T = TypeVar("T", bound=BaseModel)


class BaseRepository(Generic[T]):
    """
    Generic base repository for CRUD operations.

    This class provides standard CRUD operations using the Supabase Python client.
    All methods use parameterized queries to prevent SQL injection.

    Type Parameters:
        T: Pydantic model type that extends BaseModel
    """

    def __init__(self, table_name: str, model_class: type[T], client: Client | None = None):
        """
        Initialize repository with table name and model class.

        Args:
            table_name: Name of the Supabase table
            model_class: Pydantic model class for type conversion
            client: Optional Supabase client (uses singleton if not provided)
        """
        self.table_name = table_name
        self.model_class = model_class
        self.client = client or get_supabase_client()

    def get_all(self, skip: int = 0, limit: int = 100) -> list[T]:
        """
        Get all records from the table with pagination.

        Args:
            skip: Number of records to skip
            limit: Maximum number of records to return

        Returns:
            list[T]: List of model instances
        """
        try:
            response = (
                self.client.table(self.table_name)
                .select("*")
                .range(skip, skip + limit - 1)
                .execute()
            )

            return [self.model_class.model_validate(item) for item in response.data]

        except Exception as e:
            raise Exception(f"Failed to fetch records from {self.table_name}: {str(e)}") from e

    def get_by_id(self, id: UUID) -> T | None:
        """
        Get a single record by UUID.

        Args:
            id: UUID of the record

        Returns:
            T | None: Model instance if found, None otherwise
        """
        try:
            response = (
                self.client.table(self.table_name)
                .select("*")
                .eq("id", str(id))
                .execute()
            )

            if not response.data:
                return None

            return self.model_class.model_validate(response.data[0])

        except Exception as e:
            raise Exception(f"Failed to fetch record {id} from {self.table_name}: {str(e)}") from e

    def create(self, data: BaseModel) -> T:
        """
        Create a new record.

        Args:
            data: Pydantic model instance with data to insert

        Returns:
            T: Created model instance
        """
        try:
            # Convert Pydantic model to dict, excluding None values
            data_dict = data.model_dump(exclude_none=True)

            response = (
                self.client.table(self.table_name)
                .insert(data_dict)
                .execute()
            )

            if not response.data:
                raise Exception(f"Failed to create record in {self.table_name}")

            return self.model_class.model_validate(response.data[0])

        except Exception as e:
            raise Exception(f"Failed to create record in {self.table_name}: {str(e)}") from e

    def update(self, id: UUID, data: BaseModel) -> T:
        """
        Update an existing record.

        Args:
            id: UUID of the record to update
            data: Pydantic model instance with data to update

        Returns:
            T: Updated model instance

        Raises:
            NotFoundException: If record with given ID does not exist
        """
        try:
            # Convert Pydantic model to dict, excluding None values
            data_dict = data.model_dump(exclude_none=True)

            response = (
                self.client.table(self.table_name)
                .update(data_dict)
                .eq("id", str(id))
                .execute()
            )

            if not response.data:
                raise NotFoundException(f"Record with id {id} not found in {self.table_name}")

            return self.model_class.model_validate(response.data[0])

        except NotFoundException:
            raise
        except Exception as e:
            raise Exception(f"Failed to update record {id} in {self.table_name}: {str(e)}") from e

    def delete(self, id: UUID) -> bool:
        """
        Delete a record by UUID.

        Args:
            id: UUID of the record to delete

        Returns:
            bool: True if deletion was successful

        Raises:
            NotFoundException: If record with given ID does not exist
        """
        try:
            response = (
                self.client.table(self.table_name)
                .delete()
                .eq("id", str(id))
                .execute()
            )

            if not response.data:
                raise NotFoundException(f"Record with id {id} not found in {self.table_name}")

            return True

        except NotFoundException:
            raise
        except Exception as e:
            raise Exception(f"Failed to delete record {id} from {self.table_name}: {str(e)}") from e

