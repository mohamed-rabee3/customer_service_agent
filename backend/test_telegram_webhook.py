"""Quick test for the Telegram Webhook endpoint."""
import urllib.request
import urllib.error
import json
import uuid

BASE = "http://127.0.0.1:8000"
# We will use a random UUID to test the "agent_not_found" response, 
# and you can copy a real Agent UUID from your database to test a "success" response!
AGENT_ID = str(uuid.uuid4())

def test(label, method, path, data=None):
    print(f"=== {label} ===")
    url = f"{BASE}{path}"
    hdrs = {"Content-Type": "application/json"}
    
    encoded_data = json.dumps(data).encode("utf-8") if data else None
    
    req = urllib.request.Request(url, data=encoded_data, headers=hdrs, method=method)
    try:
        r = urllib.request.urlopen(req, timeout=5)
        body = r.read().decode()
        print(f"  Status: {r.status}")
        print(f"  Body: {body}")
        return r.status
    except urllib.error.HTTPError as e:
        body = e.read().decode() if e.fp else ""
        print(f"  Status: {e.code}")
        print(f"  Body: {body}")
        return e.code
    except Exception as e:
        print(f"  Error: {e}")
        return 0

# Mock Telegram Webhook Payload
telegram_payload = {
    "update_id": 123456789,
    "message": {
        "message_id": 1,
        "from": {
            "id": 987654321,
            "is_bot": False,
            "first_name": "Test",
            "username": "testuser"
        },
        "chat": {
            "id": 987654321,
            "first_name": "Test",
            "username": "testuser",
            "type": "private"
        },
        "date": 1690000000,
        "text": "Hello, I need help!"
    }
}

print("=== OpenAPI Check ===")
try:
    r = urllib.request.urlopen(f"{BASE}/openapi.json", timeout=5)
    schema = json.loads(r.read().decode())
    paths = list(schema.get("paths", {}).keys())
    
    webhook_path = "/v1/telegram/{agent_id}"
    if webhook_path in paths:
        methods = list(schema["paths"][webhook_path].keys())
        print(f"  [PASS] {webhook_path} -> {', '.join(m.upper() for m in methods)}")
    else:
        print(f"  [FAIL] {webhook_path} not found")
        
except Exception as e:
    print(f"  Error fetching OpenAPI: {e}")

print()
# Test the Webhook Request (Will likely say agent_not_found unless you hardcode a real ID)
test(
    f"POST /v1/telegram/{AGENT_ID} (Simulate Telegram Message)", 
    "POST", 
    f"/v1/telegram/{AGENT_ID}",
    data=telegram_payload
)

print()
print("Done!")
