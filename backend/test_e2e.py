"""Test the full pipeline: webhook -> LLM with fallback -> response."""
import httpx, json, sys, os, time
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

# Get the agent ID from webhook check
env_path = os.path.join(os.path.dirname(__file__), ".env")
env_vars = {}
with open(env_path) as f:
    for line in f:
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            env_vars[k.strip()] = v.strip()

SUPABASE_URL = env_vars["SUPABASE_URL"]
SUPABASE_SERVICE_KEY = env_vars["SUPABASE_SERVICE_KEY"]

# Find agent with valid token
import urllib.request
headers_sb = {"apikey": SUPABASE_SERVICE_KEY, "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}"}
url = f"{SUPABASE_URL}/rest/v1/agents?select=id,name,telegram_bot_token"
req = urllib.request.Request(url, headers=headers_sb)
resp = urllib.request.urlopen(req, timeout=15)
agents = json.loads(resp.read().decode())

agent_id = None
for a in agents:
    t = (a.get("telegram_bot_token") or "").strip()
    if t and not t.startswith("testtoken") and len(t) > 20:
        agent_id = a["id"]
        print(f"Using agent: {a['name']} ({agent_id[:8]}...)")
        break

if not agent_id:
    print("No valid agent found!")
    sys.exit(1)

# Send test message 
webhook_url = f"http://localhost:8000/v1/telegram/{agent_id}"
payload = {
    "update_id": 88888,
    "message": {
        "message_id": 2,
        "from": {"id": 54321, "is_bot": False, "first_name": "TestUser2"},
        "chat": {"id": 54321, "type": "private"},
        "date": 1718000000,
        "text": "Hello!"
    }
}

print(f"Sending test to {webhook_url}...")
r = httpx.post(webhook_url, json=payload, timeout=15.0)
print(f"Webhook response: {r.status_code} - {r.text}")

if r.status_code == 200:
    print("Waiting 10s for LLM processing...")
    time.sleep(10)
    
    # Check if a response was saved in chat_messages
    msg_url = f"{SUPABASE_URL}/rest/v1/chat_messages?select=role,content&order=created_at.desc&limit=5"
    req2 = urllib.request.Request(msg_url, headers=headers_sb)
    resp2 = urllib.request.urlopen(req2, timeout=15)
    msgs = json.loads(resp2.read().decode())
    print("\nRecent chat messages:")
    for m in msgs:
        print(f"  [{m['role']}] {m['content'][:80]}")
