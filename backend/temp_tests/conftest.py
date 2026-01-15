import pytest
from unittest.mock import Mock, AsyncMock
from uuid import uuid4
from datetime import datetime, timezone
from app.core.constants import UserRole, AgentType, AgentStatus

@pytest.fixture
def mock_supervisor_id():
    return uuid4()

@pytest.fixture
def mock_admin_id():
    return uuid4()

@pytest.fixture
def mock_agent_data(mock_supervisor_id):
    return {
        "id": uuid4(),
        "supervisor_id": mock_supervisor_id,
        "name": "Test Agent",
        "agent_type": AgentType.VOICE,
        "system_prompt": "You are a helpful assistant",
        "status": AgentStatus.IDLE,
        "mcp_tools": {},
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }
