"""User model representing Supabase auth.users."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr


class User(BaseModel):
    """User model representing Supabase auth.users table."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: EmailStr
    role: str  # "admin" or "supervisor" - determined by checking supervisors/admin tables
    created_at: datetime

