"""Quick test for the 2 new endpoints."""
import urllib.request
import urllib.error
import json

BASE = "http://127.0.0.1:8000"

def test(label, method, path, headers=None):
    print(f"=== {label} ===")
    url = f"{BASE}{path}"
    hdrs = headers or {}
    req = urllib.request.Request(url, headers=hdrs, method=method)
    try:
        r = urllib.request.urlopen(req, timeout=5)
        body = r.read().decode()
        print(f"  Status: {r.status}")
        print(f"  Body: {body[:300]}")
        return r.status
    except urllib.error.HTTPError as e:
        body = e.read().decode() if e.fp else ""
        print(f"  Status: {e.code}")
        print(f"  Body: {body[:300]}")
        return e.code
    except Exception as e:
        print(f"  Error: {e}")
        return 0

# Check OpenAPI for new routes
print("=== OpenAPI Check ===")
try:
    r = urllib.request.urlopen(f"{BASE}/openapi.json", timeout=5)
    schema = json.loads(r.read().decode())
    paths = list(schema.get("paths", {}).keys())
    
    # Check for GET /v1/agents
    agents_path = "/v1/agents"
    if agents_path in paths:
        methods = list(schema["paths"][agents_path].keys())
        print(f"  [PASS] {agents_path} -> {', '.join(m.upper() for m in methods)}")
    else:
        print(f"  [FAIL] {agents_path} not found")
    
    # Check for GET /v1/chat/sessions/active
    active_path = "/v1/chat/sessions/active"
    if active_path in paths:
        methods = list(schema["paths"][active_path].keys())
        print(f"  [PASS] {active_path} -> {', '.join(m.upper() for m in methods)}")
    else:
        print(f"  [FAIL] {active_path} not found")
    
    # Print all chat + agents routes
    print()
    print("  All agent/chat routes:")
    for p in sorted(paths):
        if "/agent" in p or "/chat" in p:
            methods = list(schema["paths"][p].keys())
            print(f"    {', '.join(m.upper() for m in methods):12s} {p}")
except Exception as e:
    print(f"  Error: {e}")

# Test new endpoints with auth
print()
test("GET /v1/agents (no auth)", "GET", "/v1/agents")
print()
test("GET /v1/agents (fake auth)", "GET", "/v1/agents",
     headers={"Authorization": "Bearer fake-token"})
print()
test("GET /v1/chat/sessions/active (no auth)", "GET", "/v1/chat/sessions/active")
print()
test("GET /v1/chat/sessions/active (fake auth)", "GET", "/v1/chat/sessions/active",
     headers={"Authorization": "Bearer fake-token"})

print()
print("Done!")
