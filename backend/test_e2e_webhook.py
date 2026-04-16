"""Send a test webhook to our local server to verify end-to-end processing."""
import urllib.request, json, time

# Test 1: Health check through tunnel
print("Test 1: Health check through tunnel...")
try:
    req = urllib.request.Request(
        "https://yummy-eyes-teach.loca.lt/health",
        headers={"bypass-tunnel-reminder": "true"}
    )
    resp = urllib.request.urlopen(req, timeout=10)
    print(f"  Result: {resp.read().decode()}")
except Exception as e:
    print(f"  FAILED: {e}")

# Test 2: Send a fake Telegram update to the webhook endpoint
print("\nTest 2: Sending test webhook to local server...")
agent_id = "7ae501dd-009b-48ec-b5a3-ae6583554901"
webhook_url = f"http://localhost:8000/v1/telegram/{agent_id}"

fake_update = {
    "update_id": 999999999,
    "message": {
        "message_id": 99999,
        "from": {
            "id": 12345678,
            "is_bot": False,
            "first_name": "Test",
            "language_code": "en"
        },
        "chat": {
            "id": 12345678,
            "first_name": "Test",
            "type": "private"
        },
        "date": int(time.time()),
        "text": "Hello, this is a test message"
    }
}

try:
    payload = json.dumps(fake_update).encode()
    req = urllib.request.Request(
        webhook_url,
        data=payload,
        headers={"Content-Type": "application/json"}
    )
    resp = urllib.request.urlopen(req, timeout=15)
    print(f"  Status: {resp.status}")
    print(f"  Response: {resp.read().decode()}")
except Exception as e:
    print(f"  FAILED: {e}")
    import traceback
    traceback.print_exc()

# Test 3: Check through tunnel  
print("\nTest 3: Sending test webhook through tunnel...")
tunnel_webhook_url = f"https://yummy-eyes-teach.loca.lt/v1/telegram/{agent_id}"
try:
    payload = json.dumps(fake_update).encode()
    req = urllib.request.Request(
        tunnel_webhook_url,
        data=payload,
        headers={
            "Content-Type": "application/json",
            "bypass-tunnel-reminder": "true"
        }
    )
    resp = urllib.request.urlopen(req, timeout=15)
    print(f"  Status: {resp.status}")
    print(f"  Response: {resp.read().decode()}")
except Exception as e:
    print(f"  FAILED: {e}")
