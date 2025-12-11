"""Auth request/response schemas."""

from datetime import datetime
from typing import Annotated
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr

from app.core.constants import SupervisorType, UserRole


class AdminProfile(BaseModel):
    """Admin profile details."""

    model_config = ConfigDict(from_attributes=True)

    name: str
    created_at: datetime | None = None


class SupervisorProfile(BaseModel):
    """Supervisor profile details."""

    model_config = ConfigDict(from_attributes=True)

    name: str
    supervisor_type: SupervisorType
    created_at: datetime | None = None


class UserResponse(BaseModel):
    """User response matching the OpenAPI User schema."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: EmailStr
    role: UserRole
    profile: Annotated[AdminProfile | SupervisorProfile, ...]
