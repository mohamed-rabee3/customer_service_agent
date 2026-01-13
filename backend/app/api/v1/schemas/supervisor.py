"""Supervisor schemas."""
from datetime import datetime
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict
from app.core.constants import SupervisorType

class SupervisorBase(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    supervisor_type: SupervisorType = SupervisorType.VOICE

class SupervisorResponse(SupervisorBase):
    id: UUID
    performance_score: float = 0.0
    total_interactions: int = 0
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class SupervisorListResponse(BaseModel):
    data: List[SupervisorResponse]
    total: int
    page: int
    limit: int
