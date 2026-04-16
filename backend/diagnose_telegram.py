"""Diagnose Telegram bot integration issues."""
import sys
import os
import json
import urllib.request
import urllib.error

# Fix Windows encoding
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

sys.path.append(os.path.abspath(os.path.dirname(__file__)))
from app.db.supabase import get_supabase_service_client

print("=" * 60)
print("TELEGRAM BOT DIAGNOSTIC")
print("=" * 60)

# Step 1: Check agents with telegram tokens
print("\n--- Step 1: Checking agents with Telegram bot tokens ---")
client = get_supabase_service_client()
res = client.table("agents").select("id, name, telegram_bot_token, webhook_configs, status, system_prompt").execute()

agents_with_tokens = []
for a in res.data:
    legacy_token = a.get("telegram_bot_token") 
    webhook_configs = a.get("webhook_configs") or {}
    tg_config = webhook_configs.get("telegram") or {}
    wc_token = tg_config.get("bot_token")
    
    token = None
    source = None
    if legacy_token and legacy_token.strip():
        token = legacy_token.strip()
        source = "telegram_bot_token column"
    elif tg_config.get("enabled") and wc_token and wc_token.strip():
        token = wc_token.strip()
        source = "webhook_configs.telegram.bot_token"

    if token:
        agents_with_tokens.append({
            "id": a["id"],
            "name": a["name"],
            "token": token,
            "source": source,
            "status": a.get("status"),
            "has_system_prompt": bool(a.get("system_prompt")),
        })

if not agents_with_tokens:
    print("[FAIL] NO agents found with a valid Telegram bot token!")
    print("   All agents:")
    for a in res.data:
        print(f"   - {a['name']} (id={a['id'][:8]}...) | telegram_bot_token={a.get('telegram_bot_token')!r} | webhook_configs={json.dumps(a.get('webhook_configs'))}")
    sys.exit(1)

for ag in agents_with_tokens:
    print(f"[OK] Agent: {ag['name']} (id={ag['id']})")
    print(f"   Token source: {ag['source']}")
    print(f"   Token: {ag['token'][:20]}...")
    print(f"   Status: {ag['status']}")
    print(f"   Has system_prompt: {ag['has_system_prompt']}")

# Step 2: Validate bot token with Telegram API
print("\n--- Step 2: Validating bot tokens with Telegram API ---")
for ag in agents_with_tokens:
    token = ag["token"]
    url = f"https://api.telegram.org/bot{token}/getMe"
    try:
        req = urllib.request.Request(url)
        response = urllib.request.urlopen(req, timeout=10)
        data = json.loads(response.read().decode())
        if data.get("ok"):
            bot_info = data["result"]
            print(f"[OK] Bot token VALID for agent '{ag['name']}'")
            print(f"   Bot username: @{bot_info.get('username')}")
            print(f"   Bot name: {bot_info.get('first_name')}")
        else:
            print(f"[FAIL] Bot token INVALID for agent '{ag['name']}': {data}")
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        print(f"[FAIL] Bot token INVALID for agent '{ag['name']}': HTTP {e.code} - {body}")
    except Exception as e:
        print(f"[FAIL] Error checking bot token for agent '{ag['name']}': {e}")

# Step 3: Check current webhook info
print("\n--- Step 3: Checking current Telegram webhook info ---")
for ag in agents_with_tokens:
    token = ag["token"]
    url = f"https://api.telegram.org/bot{token}/getWebhookInfo"
    try:
        req = urllib.request.Request(url)
        response = urllib.request.urlopen(req, timeout=10)
        data = json.loads(response.read().decode())
        if data.get("ok"):
            info = data["result"]
            print(f"Agent '{ag['name']}':")
            print(f"   Webhook URL: {info.get('url') or '(none set)'}")
            print(f"   Pending updates: {info.get('pending_update_count', 0)}")
            print(f"   Last error: {info.get('last_error_message') or '(none)'}")
            print(f"   Last error date: {info.get('last_error_date') or '(none)'}")
        else:
            print(f"[FAIL] Could not get webhook info: {data}")
    except Exception as e:
        print(f"[FAIL] Error: {e}")

# Step 4: Check OpenRouter API key
print("\n--- Step 4: Checking OpenRouter API key ---")
from app.core.config import settings
api_key = settings.openrouter_api_key
model = settings.openrouter_model
print(f"   API key set: {bool(api_key and api_key != '')}")
print(f"   API key starts with: {api_key[:15]}..." if api_key else "   API key: (empty!)")
print(f"   Model: {model}")

# Quick test of OpenRouter
try:
    import httpx
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": model,
        "messages": [{"role": "user", "content": "Say hello in one word"}],
        "max_tokens": 10,
    }
    resp = httpx.post("https://openrouter.ai/api/v1/chat/completions", json=payload, headers=headers, timeout=15.0)
    if resp.status_code == 200:
        result = resp.json()
        content = result.get("choices", [{}])[0].get("message", {}).get("content", "")
        print(f"[OK] OpenRouter API is working! Response: {content[:50]}")
    else:
        print(f"[FAIL] OpenRouter API error: HTTP {resp.status_code}")
        print(f"   Response: {resp.text[:300]}")
except Exception as e:
    print(f"[FAIL] OpenRouter API test failed: {e}")

# Step 5: Check if backend is running
print("\n--- Step 5: Checking if backend server is running ---")
try:
    import httpx
    resp = httpx.get("http://localhost:8000/docs", timeout=5)
    print(f"[OK] Backend server is running (status {resp.status_code})")
except Exception as e:
    print(f"[FAIL] Backend server NOT reachable: {e}")

print("\n" + "=" * 60)
print("DIAGNOSTIC COMPLETE")
print("=" * 60)
