import urllib.request, json

token = "8627012748:AAGxCvcIEoR8HZu2uL64GQwmHIv9MWXDL_0"
agent_id = "7ae501dd-009b-48ec-b5a3-ae6583554901"
tunnel_url = "https://upset-singers-sniff.loca.lt"

webhook_url = f"{tunnel_url}/v1/telegram/{agent_id}"
print(f"Setting webhook to: {webhook_url}")

set_url = f"https://api.telegram.org/bot{token}/setWebhook"
payload = json.dumps({"url": webhook_url, "drop_pending_updates": True}).encode()
req = urllib.request.Request(set_url, data=payload, headers={"Content-Type": "application/json"})
resp = urllib.request.urlopen(req, timeout=15)
result = json.loads(resp.read().decode())
print(f"Result: {json.dumps(result)}")
