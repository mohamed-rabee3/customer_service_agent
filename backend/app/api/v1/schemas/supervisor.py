"""Supervisor schemas."""

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.core.constants import AgentStatus, AgentType, SupervisorType


class SupervisorResponse(BaseModel):
    """Response schema for supervisor data."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: str | None = None
    name: str
    supervisor_type: SupervisorType
    agent_count: int = 0
    performance_score: float | None = None
    total_interactions: int = 0
    created_at: datetime
    updated_at: datetime


class SupervisorDetailResponse(BaseModel):
    """Detailed supervisor response with agents and recent interactions."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: str | None = None
    name: str
    supervisor_type: SupervisorType
    performance_score: float | None = None
    total_interactions: int = 0
    created_at: datetime
    updated_at: datetime
    agents: list[dict[str, Any]] = Field(default_factory=list)
    recent_interactions: list[dict[str, Any]] = Field(default_factory=list)


class SupervisorListResponse(BaseModel):
    """Paginated list of supervisors."""

    supervisors: list[SupervisorResponse]
    total: int
    page: int
    limit: int


class AgentDashboardCard(BaseModel):
    """Agent card data for supervisor dashboard."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    agent_type: AgentType
    system_prompt: str = ""
    status: AgentStatus
    performance_score: float | None = None
    total_interactions: int = 0
    mcp_tools: dict[str, Any] = Field(default_factory=dict)
    webhook_configs: dict[str, Any] = Field(default_factory=dict)
    current_interaction: dict[str, Any] | None = None
    latest_metrics: dict[str, Any] | None = None


class SupervisorDashboardResponse(BaseModel):
    """Response for supervisor dashboard endpoint."""

    agents: list[AgentDashboardCard]
    total: int


class SupervisorCreate(BaseModel):
    """Schema for creating a new supervisor (admin only)."""

    email: str = Field(..., description="Email for auth user creation")
    password: str = Field(..., min_length=6, description="Password for auth user")
    name: str = Field(default="", description="Supervisor's full name")
    supervisor_type: SupervisorType = Field(default=SupervisorType.VOICE, description="Supervisor type")


class SupervisorUpdate(BaseModel):
    """Schema for updating a supervisor (admin only)."""

    name: str | None = None
    email: str | None = None
    supervisor_type: SupervisorType | None = None
    performance_score: float | None = None
    total_interactions: int | None = None
