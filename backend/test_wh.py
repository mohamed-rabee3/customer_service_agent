import urllib.request, json
url = 'http://127.0.0.1:8000/v1/telegram/c8b7ad22-1025-4a2f-8fa9-be7601c1ffbb'
payload = {
    "update_id": 1,
    "message": {
        "message_id": 1,
        "date": 1234567,
        "chat": {"id": 123, "type": "private"},
        "text": "hello test message"
    }
}
req = urllib.request.Request(
    url,
    method='POST',
    headers={'Content-Type': 'application/json'},
    data=json.dumps(payload).encode()
)
res = urllib.request.urlopen(req)
print(res.read().decode())
