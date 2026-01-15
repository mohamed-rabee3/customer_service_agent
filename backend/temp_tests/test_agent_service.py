import pytest
from unittest.mock import Mock, patch
from uuid import uuid4
from datetime import datetime
from fastapi import HTTPException
from app.services.agent_service import (
    create_agent,
    get_agent,
    update_agent,
    delete_agent,
    MAX_AGENTS_PER_SUPERVISOR
)
from app.api.v1.schemas.agent import CreateAgentRequest, UpdateAgentRequest
from app.core.constants import AgentType, AgentStatus
from app.core.exceptions import (
    AgentBusyException,
    ForbiddenException,
    NotFoundException,
)
from app.repositories.agent_repository import AgentModel

# Mock the Repository Singleton
@pytest.fixture
def mock_repo():
    with patch("app.services.agent_service.agent_repository") as mock:
        yield mock

class TestAgentService:
    def test_create_agent_success(self, mock_repo, mock_supervisor_id):
        # Arrange
        mock_repo.count_by_supervisor.return_value = 0
        req = CreateAgentRequest(name="Test", system_prompt="Prompt")
        expected_agent = AgentModel(
            id=uuid4(),
            supervisor_id=mock_supervisor_id,
            name="Test",
            agent_type=AgentType.VOICE,
            system_prompt="Prompt",
            status=AgentStatus.IDLE,
            mcp_tools={},
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
        mock_repo.create_agent.return_value = expected_agent

        # Act
        result = create_agent(mock_supervisor_id, req)

        # Assert
        assert result == expected_agent
        mock_repo.create_agent.assert_called_once()

    def test_create_agent_limit_exceeded(self, mock_repo, mock_supervisor_id):
        # Arrange
        mock_repo.count_by_supervisor.return_value = MAX_AGENTS_PER_SUPERVISOR
        req = CreateAgentRequest(name="Test", system_prompt="Prompt")

        # Act & Assert
        with pytest.raises(HTTPException) as exc:
            create_agent(mock_supervisor_id, req)
        assert exc.value.status_code == 400
        assert "Maximum" in exc.value.detail

    def test_get_agent_ownership_success(self, mock_repo, mock_supervisor_id, mock_agent_data):
        # Arrange
        agent_model = AgentModel(**mock_agent_data)
        mock_repo.get_by_id.return_value = agent_model

        # Act
        result = get_agent(agent_model.id, mock_supervisor_id)

        # Assert
        assert result == agent_model

    def test_get_agent_ownership_forbidden(self, mock_repo, mock_supervisor_id, mock_agent_data):
        # Arrange
        agent_model = AgentModel(**mock_agent_data)
        other_user_id = uuid4()
        mock_repo.get_by_id.return_value = agent_model

        # Act & Assert
        with pytest.raises(ForbiddenException):
            get_agent(agent_model.id, other_user_id)

    def test_update_agent_busy_failure(self, mock_repo, mock_supervisor_id, mock_agent_data):
        # Arrange
        mock_agent_data["status"] = AgentStatus.IN_CALL
        agent_model = AgentModel(**mock_agent_data)
        mock_repo.get_by_id.return_value = agent_model
        req = UpdateAgentRequest(name="New Name")

        # Act & Assert
        with pytest.raises(AgentBusyException):
            update_agent(agent_model.id, mock_supervisor_id, req)

    def test_delete_agent_fk_violation(self, mock_repo, mock_supervisor_id, mock_agent_data):
        # Arrange
        agent_model = AgentModel(**mock_agent_data)
        mock_repo.get_by_id.return_value = agent_model
        mock_repo.delete.side_effect = Exception("violates foreign key constraint")

        # Act & Assert
        with pytest.raises(HTTPException) as exc:
            delete_agent(agent_model.id, mock_supervisor_id)
        
        assert exc.value.status_code == 409
        assert "existing interactions" in exc.value.detail
