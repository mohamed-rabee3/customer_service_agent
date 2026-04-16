import sys
import os
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from app.db.supabase import get_supabase_service_client

client = get_supabase_service_client()
res = client.table("agents").select("*").execute()

print("--- ALL AGENTS IN DB ---")
for a in res.data:
    print(f"ID: {a['id']} | Name: {a['name']} | Type: {a['agent_type']} | SupID: {a['supervisor_id']}")
print("------------------------")
