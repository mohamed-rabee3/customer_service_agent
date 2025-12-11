"""Application constants."""

from enum import Enum


# Agent Limits
MAX_AGENTS_PER_SUPERVISOR = 3
MAX_SUPERVISORS_ON_DASHBOARD = 15

# Sentiment Values
class Sentiment(str, Enum):
    """Sentiment analysis values."""

    GOOD = "good"
    NEUTRAL = "neutral"
    CRITICAL = "critical"


# Agent Status
class AgentStatus(str, Enum):
    """Agent status values."""

    IDLE = "idle"
    IN_CALL = "in_call"
    IN_CHAT = "in_chat"
    PAUSED = "paused"


# Interaction Status
class InteractionStatus(str, Enum):
    """Interaction status values."""

    ACTIVE = "active"
    COMPLETED = "completed"
    FAILED = "failed"


# Supervisor Type
class SupervisorType(str, Enum):
    """Supervisor type values."""

    VOICE = "voice"
    CHAT = "chat"


# Agent Type
class AgentType(str, Enum):
    """Agent type values."""

    VOICE = "voice"
    CHAT = "chat"


# Interaction Type
class InteractionType(str, Enum):
    """Interaction type values."""

    VOICE = "voice"
    CHAT = "chat"


# Tool Permission Status
class ToolPermissionStatus(str, Enum):
    """Tool permission status values."""

    PENDING = "pending"
    ALLOWED = "allowed"
    DENIED = "denied"
    EXPIRED = "expired"
    COMPLETED = "completed"


# User Role
class UserRole(str, Enum):
    """User role values."""

    ADMIN = "admin"
    SUPERVISOR = "supervisor"

