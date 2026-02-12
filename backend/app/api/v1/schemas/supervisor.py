"""Supervisor schemas."""

from pydantic import BaseModel, EmailStr
from uuid import UUID
from datetime import datetime
from typing import Optional, Literal


class SupervisorOut(BaseModel):
    userID: UUID
    supervisor_type: str
    performance_score: float
    total_interactions: int
    created_at: datetime
    updated_at: datetime


class SupervisorCreate(BaseModel):
    email: EmailStr
    password: str
    supervisor_type: Literal["chat", "voice"]


class SupervisorUpdate(BaseModel):
    supervisor_type: Optional[Literal["chat", "voice"]] = None
    performance_score: Optional[float] = None
    total_interactions: Optional[int] = None
