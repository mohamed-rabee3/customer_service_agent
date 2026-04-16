import sys, os
sys.path.append(os.path.abspath(os.path.dirname(__file__)))
from app.db.supabase import get_supabase_service_client

db = get_supabase_service_client()

# Close all stale active sessions
res = db.table("interactions").select("id, call_source_id, status").eq("status", "active").execute()
print(f"Active sessions: {len(res.data)}")
for s in res.data:
    print(f"  Closing: {s['id'][:8]}... source={s['call_source_id']}")
    db.table("interactions").update({"status": "completed"}).eq("id", s["id"]).execute()

if res.data:
    print("All stale sessions closed!")
    # Also reset agent status to idle
    db.table("agents").update({"status": "idle"}).eq("id", "7ae501dd-009b-48ec-b5a3-ae6583554901").execute()
    print("Agent status reset to idle")
else:
    print("No stale sessions found")
