"""Check available free models on OpenRouter."""
import urllib.request, json, os

api_key = "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"

# Try a simple prompt with different models
models_to_test = [
    "google/gemma-3-4b-it:free",
    "meta-llama/llama-3.2-3b-instruct:free",
    "qwen/qwen3-next-80b-a3b-instruct:free",
    "nvidia/nemotron-3-super-120b-a12b:free",
    "openai/gpt-oss-20b:free",
    "mistralai/mistral-small-3.1-24b-instruct:free",
    "deepseek/deepseek-chat-v3-0324:free",
    "deepseek/deepseek-r1-0528:free",
]

for model in models_to_test:
    print(f"Testing {model}...", end=" ", flush=True)
    try:
        payload = json.dumps({
            "model": model,
            "messages": [{"role": "user", "content": "Say hi"}],
            "max_tokens": 10,
        }).encode()
        req = urllib.request.Request(
            "https://openrouter.ai/api/v1/chat/completions",
            data=payload,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {api_key}",
                "HTTP-Referer": "https://customer-service-agent.app",
                "X-Title": "Customer Service Agent",
            }
        )
        resp = urllib.request.urlopen(req, timeout=30)
        result = json.loads(resp.read().decode())
        content = result.get("choices", [{}])[0].get("message", {}).get("content", "")
        print(f"OK! Response: {content[:50]}")
        break
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        print(f"HTTP {e.code}: {body[:100]}")
    except Exception as e:
        print(f"Error: {e}")
