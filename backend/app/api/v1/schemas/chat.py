"""Chat session request/response schemas."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class StartChatRequest(BaseModel):
    """Request to start a new chat session."""

    agent_id: UUID = Field(..., description="UUID of the agent to chat with")


class StartChatResponse(BaseModel):
    """Response after starting a chat session."""

    model_config = ConfigDict(from_attributes=True)

    session_id: UUID = Field(..., description="Interaction ID (chat session)")
    agent_id: UUID
    agent_name: str


class SendMessageRequest(BaseModel):
    """Request to send a customer message."""

    content: str = Field(
        ..., min_length=1, max_length=5000,
        description="The customer's message text",
    )


class WhisperRequest(BaseModel):
    """Request for supervisor to inject an instruction."""

    content: str = Field(
        ..., min_length=1, max_length=2000,
        description="Supervisor instruction for the agent",
    )


class ChatMessageResponse(BaseModel):
    """A single chat message."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    interaction_id: UUID
    role: str  # 'customer', 'agent', 'supervisor'
    content: str
    created_at: datetime


class ChatSessionStatus(BaseModel):
    """Current status of a chat session."""

    session_id: UUID
    agent_id: UUID
    agent_name: str
    status: str  # 'active', 'completed'
    message_count: int
    started_at: datetime
