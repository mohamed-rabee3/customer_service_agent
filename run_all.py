import os
import subprocess
import time
import sys
import urllib.request
import json
import signal
import re

# Configuration
BACKEND_DIR = "backend"
FRONTEND_DIR = "frontend"
BACKEND_PORT = 8000
FRONTEND_PORT = 5173
NGROK_API_URL = "http://localhost:4040/api/tunnels"

processes = []

def signal_handler(sig, frame):
    print("\nStopping all services...")
    for p in processes:
        try:
            p.terminate()
        except:
            pass
    sys.exit(0)

signal.signal(signal.SIGINT, signal_handler)

def run_backend():
    print("Starting Backend...")
    # Use absolute path for venv python to avoid CWD issues
    venv_python = os.path.abspath(os.path.join(BACKEND_DIR, "venv", "Scripts", "python.exe"))
    if not os.path.exists(venv_python):
        print(f"Warning: Venv python not found at {venv_python}. Falling back to system python.")
        venv_python = "python"  # Fallback
    
    cmd = [venv_python, "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", str(BACKEND_PORT)]
    p = subprocess.Popen(cmd, cwd=BACKEND_DIR)
    processes.append(p)
    return p

def run_frontend():
    print("Starting Frontend...")
    # Using shell=True for npm on Windows
    p = subprocess.Popen("npm run dev -- --port " + str(FRONTEND_PORT), cwd=FRONTEND_DIR, shell=True)
    processes.append(p)
    return p

def run_ngrok():
    print("Starting Ngrok...")
    # npx --yes ngrok http 8000
    p = subprocess.Popen(f"npx --yes ngrok http {BACKEND_PORT}", shell=True)
    processes.append(p)
    return p

def get_ngrok_url():
    print("Waiting for Ngrok public URL...")
    for _ in range(30):
        try:
            with urllib.request.urlopen(NGROK_API_URL) as response:
                if response.status == 200:
                    data = json.loads(response.read().decode())
                    tunnels = data.get("tunnels", [])
                    for tunnel in tunnels:
                        if tunnel.get("proto") == "https":
                            return tunnel.get("public_url")
        except:
            pass
        time.sleep(1)
    return None

def update_telegram_webhook(public_url):
    print(f"Updating Telegram Webhook with: {public_url}")
    # Use absolute path for venv python
    venv_python = os.path.abspath(os.path.join(BACKEND_DIR, "venv", "Scripts", "python.exe"))
    if not os.path.exists(venv_python):
        venv_python = "python"
    
    updater_script_name = "update_webhook_final.py"
    updater_script_path = os.path.join(BACKEND_DIR, updater_script_name)
    
    with open(updater_script_path, "w") as f:
        f.write(f"""
import sys
import os
import urllib.request
import json
sys.path.append(os.path.abspath(os.path.dirname(__file__)))
from app.db.supabase import get_supabase_service_client

public_url = "{public_url}"
client = get_supabase_service_client()

# Fetch all agents with telegram tokens
res = client.table("agents").select("id, webhook_configs").execute()
for agent in res.data:
    configs = agent.get("webhook_configs") or {{}}
    tg_config = configs.get("telegram") or {{}}
    bot_token = tg_config.get("bot_token")
    if tg_config.get("enabled") and bot_token and bot_token != "{{}}":
        webhook_url = f"{{public_url}}/v1/telegram/{{agent['id']}}"
        print(f"Setting webhook for {{agent['id']}} to {{webhook_url}}")
        api_url = f"https://api.telegram.org/bot{{bot_token}}/setWebhook?url={{webhook_url}}"
        try:
            with urllib.request.urlopen(api_url) as resp:
                print(f"Telegram response: {{resp.read().decode()}}")
        except Exception as e:
            err_msg = str(e)
            if "429" in err_msg:
                print(f"Failed to update Telegram: Rate limited (429).")
            elif "404" in err_msg:
                print(f"Failed to update Telegram: Invalid token (404). Check token for agent {{agent['id']}}.")
            else:
                print(f"Failed to update Telegram: {{e}}")
        
        # Avoid rate limits
        import time
        time.sleep(1)
""")
    
    print(f"Running updater from {BACKEND_DIR} using {venv_python}")
    subprocess.run([venv_python, updater_script_name], cwd=BACKEND_DIR)
    os.remove(updater_script_path)

def update_env_file(public_url):
    print(f"Updating backend/.env with new WEBHOOK_DOMAIN: {public_url}")
    env_path = os.path.join(BACKEND_DIR, ".env")
    if not os.path.exists(env_path):
        print(f"Warning: .env file not found at {env_path}")
        return
        
    with open(env_path, "r") as f:
        lines = f.readlines()
        
    updated = False
    with open(env_path, "w") as f:
        for line in lines:
            if line.startswith("WEBHOOK_DOMAIN="):
                f.write(f"WEBHOOK_DOMAIN={public_url}\n")
                updated = True
            else:
                f.write(line)
        if not updated:
            f.write(f"\nWEBHOOK_DOMAIN={public_url}\n")

def main():
    try:
        run_backend()
        run_frontend()
        run_ngrok()
        
        # Give ngrok a moment to establish the tunnel
        print("Waiting 3 seconds for services to settle...")
        time.sleep(3)
        
        public_url = get_ngrok_url()
        if public_url:
            print(f"\nSUCCESS: App is available publicly at: {public_url}")
            print(f"SUCCESS: Frontend is running locally at: http://localhost:{FRONTEND_PORT}")
            update_env_file(public_url)
            update_telegram_webhook(public_url)
        else:
            print("\nWARNING: Failed to get Ngrok URL. Webhooks may not work.")
        
        print("\nAll systems running! Press Ctrl+C to stop everything.")
        
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        signal_handler(None, None)

if __name__ == "__main__":
    main()
