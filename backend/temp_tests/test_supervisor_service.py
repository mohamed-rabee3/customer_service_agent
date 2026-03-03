import pytest
from unittest.mock import Mock, patch
from uuid import uuid4
from datetime import datetime
from fastapi import HTTPException
from app.services.supervisor_service import (
    get_supervisor_dashboard,
    get_supervisor_detail,
    list_supervisors
)
from app.core.constants import UserRole, SupervisorType
from app.core.exceptions import ForbiddenException, NotFoundException
from app.repositories.supervisor_repository import SupervisorModel

@pytest.fixture
def mock_repo():
    with patch("app.services.supervisor_service.supervisor_repository") as mock:
        yield mock

class TestSupervisorService:
    def test_dashboard_enrichment(self, mock_repo, mock_supervisor_id):
        # Arrange
        mock_repo.get_by_id.return_value = SupervisorModel(
            userID=mock_supervisor_id,
            supervisor_type=SupervisorType.VOICE,
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
        mock_repo.get_dashboard_data.return_value = [
            {"id": uuid4(), "name": "Agent 1", "current_interaction": {"id": "123"}, "latest_metrics": {"sentiment": "good"}}
        ]

        # Act
        result = get_supervisor_dashboard(mock_supervisor_id)

        # Assert
        assert len(result["agents"]) == 1
        assert result["agents"][0]["name"] == "Agent 1"
        assert result["agents"][0]["latest_metrics"]["sentiment"] == "good"

    def test_get_detail_admin_access(self, mock_repo, mock_supervisor_id, mock_admin_id):
        # Arrange
        supervisor_model = SupervisorModel(
            userID=mock_supervisor_id,
            supervisor_type=SupervisorType.VOICE,
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
        mock_repo.get_by_id.return_value = supervisor_model
        mock_repo.get_dashboard_data.return_value = []
        mock_repo.get_recent_interactions.return_value = []

        # Act: Admin requesting Supervisor Detail
        result = get_supervisor_detail(
            supervisor_id=mock_supervisor_id,
            current_user_id=mock_admin_id,
            current_user_role=UserRole.ADMIN
        )

        # Assert
        assert result["id"] == mock_supervisor_id

    def test_get_detail_forbidden(self, mock_repo, mock_supervisor_id):
        # Arrange
        other_user_id = uuid4()

        # Act & Assert
        with pytest.raises(ForbiddenException):
            get_supervisor_detail(
                supervisor_id=mock_supervisor_id,
                current_user_id=other_user_id,
                current_user_role=UserRole.SUPERVISOR
            )
