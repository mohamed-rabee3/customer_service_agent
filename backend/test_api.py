import sys
import os
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from fastapi.testclient import TestClient
from app.main import app
from app.api.deps import get_current_user
from app.api.v1.schemas.auth import UserResponse, SupervisorProfile
import uuid

# Mock the current user dependency
def override_get_current_user():
    return UserResponse(
        id=uuid.UUID("fc5e595b-d9b7-4de8-9981-1f6828bbbc21"),
        email="AhmedAbdelfatah1@gmail.com",
        role="supervisor",
        profile=SupervisorProfile(
            name="Ahmed",
            supervisor_type="chat"
        )
    )

app.dependency_overrides[get_current_user] = override_get_current_user

client = TestClient(app)

response = client.post(
    "/v1/agents",
    json={
        "name": "Test Chat Agent",
        "system_prompt": "You are a helpful assistant.",
        "telegram_bot_token": "",
        "agent_type": "chat"
    }
)

print(f"STATUS CODE: {response.status_code}")
print(f"RESPONSE JSON: {response.json()}")
