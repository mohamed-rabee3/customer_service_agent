"""Send a simulated webhook request to the local server to test the pipeline."""
import urllib.request
import json

# Simulate a Telegram update payload
test_payload = {
    "update_id": 999999999,
    "message": {
        "message_id": 1234,
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
        "date": 1713211000,
        "text": "hello test"
    }
}

agent_id = "04364cb3-1805-40b8-bd72-25a5b75920bf"
url = f"http://localhost:8000/v1/telegram/{agent_id}"

print(f"Sending test webhook to: {url}")
data = json.dumps(test_payload).encode()
req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
try:
    resp = urllib.request.urlopen(req, timeout=15)
    print(f"Response: {resp.getcode()} - {resp.read().decode()}")
except urllib.error.HTTPError as e:
    print(f"HTTP Error: {e.code} - {e.read().decode()}")
except Exception as e:
    print(f"Error: {e}")
