"""Test OpenRouter with fallback models."""
import httpx, json, sys, os
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

env_path = os.path.join(os.path.dirname(__file__), ".env")
env_vars = {}
with open(env_path) as f:
    for line in f:
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            env_vars[k.strip()] = v.strip()

api_key = env_vars.get("OPENROUTER_API_KEY", "")

models = [
    "google/gemma-3-27b-it:free",
    "google/gemma-3-12b-it:free",
    "meta-llama/llama-3.3-70b-instruct:free",
    "meta-llama/llama-3.2-3b-instruct:free",
    "google/gemma-3-4b-it:free",
]

headers = {
    "Authorization": f"Bearer {api_key}",
    "Content-Type": "application/json",
}

for model in models:
    payload = {
        "model": model,
        "messages": [{"role": "user", "content": "Say hi in one word"}],
        "max_tokens": 10,
    }
    try:
        resp = httpx.post("https://openrouter.ai/api/v1/chat/completions", json=payload, headers=headers, timeout=15.0)
        if resp.status_code == 200:
            content = resp.json().get("choices", [{}])[0].get("message", {}).get("content", "")
            print(f"[OK] {model} -> {content.strip()}")
            break
        else:
            print(f"[FAIL] {model} -> HTTP {resp.status_code}")
    except Exception as e:
        print(f"[FAIL] {model} -> {e}")
