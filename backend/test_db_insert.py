import sys
import os
import uuid
import traceback

sys.path.append(os.path.abspath(os.path.dirname(__file__)))
from app.db.supabase import get_supabase_service_client

temp_client = get_supabase_service_client()

try:
    res = temp_client.table("agents").insert({
        "supervisor_id": "fc5e595b-d9b7-4de8-9981-1f6828bbbc21",
        "name": "Test",
        "agent_type": "chat",
        "system_prompt": "Test",
        "status": "idle",
        "telegram_bot_token": "",
        "mcp_tools": {},
        "created_at": "2026-04-13T00:00:00Z",
        "updated_at": "2026-04-13T00:00:00Z",
    }).execute()
    print("SUCCESS!", res)
except Exception as e:
    print("ERROR CAUGHT:")
    traceback.print_exc()
