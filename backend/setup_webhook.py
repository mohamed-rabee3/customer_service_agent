import time
import subprocess
import re
import urllib.request
import urllib.error
import sys
import os

sys.path.append(os.path.abspath(os.path.dirname(__file__)))
from app.db.supabase import get_supabase_service_client

print("Finding agent with telegram bot token...")
client = get_supabase_service_client()
agents_with_tokens = []

while True:
    res = client.table("agents").select("id, name, telegram_bot_token, webhook_configs").execute()
    
    for a in res.data:
        # Check legacy
        legacy_token = a.get("telegram_bot_token")
        if legacy_token and legacy_token.strip():
            token = legacy_token.strip()
            # Skip obviously fake/test tokens
            if token.startswith("testtoken") or len(token) < 20:
                print(f"  Skipping agent '{a.get('name')}' - test/invalid token")
                continue
            agents_with_tokens.append({"id": a["id"], "name": a.get("name", "?"), "token": token})
            continue
        
        # Check webhook_configs
        webhook_configs = a.get("webhook_configs") or {}
        tg_config = webhook_configs.get("telegram") or {}
        bot_token = tg_config.get("bot_token")
        if tg_config.get("enabled") and bot_token and bot_token.strip():
            token = bot_token.strip()
            if token.startswith("testtoken") or len(token) < 20:
                print(f"  Skipping agent '{a.get('name')}' - test/invalid token")
                continue
            agents_with_tokens.append({"id": a["id"], "name": a.get("name", "?"), "token": token})

    if not agents_with_tokens:
        print("WARNING: No agents found with a valid telegram_bot_token. Waiting...")
        time.sleep(10)
        continue
    break

# Validate the token with Telegram API and use the first valid one
agent = None
for candidate in agents_with_tokens:
    print(f"  Validating token for agent '{candidate['name']}' ({candidate['id'][:8]}...)...")
    try:
        check_url = f"https://api.telegram.org/bot{candidate['token']}/getMe"
        req = urllib.request.Request(check_url)
        resp = urllib.request.urlopen(req, timeout=10)
        import json as _json
        data = _json.loads(resp.read().decode())
        if data.get("ok"):
            agent = candidate
            print(f"  Token VALID! Bot: @{data['result'].get('username')}")
            break
    except Exception as e:
        print(f"  Token validation failed for '{candidate['name']}': {e}")
        continue

if not agent:
    print("ERROR: No agent with a valid Telegram bot token found!")
    sys.exit(1)

agent_id = agent["id"]
bot_token = agent["token"]


print(f"Found Agent ID: {agent_id}")
print("Starting localtunnel on port 8000...")

# Use shell=True to easily call npx on Windows
process = subprocess.Popen("npx -y localtunnel --port 8000", stdout=subprocess.PIPE, stderr=subprocess.PIPE, shell=True, text=True)

public_url = None
# Wait up to 30 seconds for the URL to appear
start_time = time.time()
while time.time() - start_time < 30:
    line = process.stdout.readline()
    if line:
        print(f"LOCALTUNNEL OUT: {line.strip()}")
        # your url is: https://rapid-fox-45.loca.lt
        match = re.search(r'your url is:\s*(https://\S+)', line)
        if match:
            public_url = match.group(1)
            break
    if process.poll() is not None:
        print("Process exited unexpectedly!")
        break
    time.sleep(0.5)

if not public_url:
    print("ERROR: Failed to obtain public URL from localtunnel.")
    process.terminate()
    sys.exit(1)

print(f"Got Public URL: {public_url}")

webhook_url = f"{public_url}/v1/telegram/{agent_id}"
set_webhook_api = f"https://api.telegram.org/bot{bot_token}/setWebhook?url={webhook_url}"

print(f"Setting Webhook pointing to: {webhook_url}")
try:
    req = urllib.request.Request(set_webhook_api)
    response = urllib.request.urlopen(req, timeout=10)
    print(f"Telegram API Response: {response.read().decode()}")
except urllib.error.HTTPError as e:
    print(f"FAILED TO SET WEBHOOK! HTTP Error: {e.code}")
    print(f"Response: {e.read().decode()}")
except Exception as e:
    print(f"FAILED TO SET WEBHOOK! Error: {e}")

print("Webhook setup completed. The localtunnel process is running in the background of this python script.")
print("Waiting 1 hour or until terminated...")
time.sleep(3600)
process.terminate()

