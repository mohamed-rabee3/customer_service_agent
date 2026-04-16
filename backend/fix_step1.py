import sys, os, json, urllib.request, urllib.error
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

# Step 1: Fix token in DB
from app.db.supabase import get_supabase_service_client
db = get_supabase_service_client()
res = db.table("agents").select("id, telegram_bot_token").execute()
a = [x for x in res.data if x.get("telegram_bot_token")][0]
agent_id = a["id"]
clean_token = "".join(a["telegram_bot_token"].split())

# Update DB with clean token
db.table("agents").update({"telegram_bot_token": clean_token}).eq("id", agent_id).execute()
print("STEP1: Token cleaned and saved to DB")
print("AGENT_ID=" + agent_id)
print("TOKEN_LEN=" + str(len(clean_token)))
