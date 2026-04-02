"""Test all chat endpoints against the running server (no auth keys needed)."""
import urllib.request
import urllib.error
import json

BASE = "http://127.0.0.1:8000"

def test(label, method, path, body=None, headers=None, expect=None):
    print(f"=== {label} ===")
    url = f"{BASE}{path}"
    hdrs = headers or {}
    hdrs["Content-Type"] = "application/json"
    data = json.dumps(body).encode() if body else None
    req = urllib.request.Request(url, data=data, headers=hdrs, method=method)
    try:
        r = urllib.request.urlopen(req, timeout=5)
        body_text = r.read().decode()
        print(f"  Status: {r.status}")
        print(f"  Body: {body_text[:300]}")
        if expect and r.status == expect:
            print(f"  [PASS] Got expected {expect}")
        return r.status
    except urllib.error.HTTPError as e:
        body_text = e.read().decode() if e.fp else ""
        print(f"  Status: {e.code}")
        print(f"  Body: {body_text[:300]}")
        if expect and e.code == expect:
            print(f"  [PASS] Got expected {expect}")
        else:
            print(f"  [INFO] Expected {expect}" if expect else "")
        return e.code
    except Exception as e:
        print(f"  Error: {e}")
        return 0

results = []

# Test 1: Health
s = test("Test 1: Health Check", "GET", "/health", expect=200)
results.append(("Health", s == 200))

# Test 2: OpenAPI - check chat routes exist
print("\n=== Test 2: OpenAPI Schema ===")
try:
    r = urllib.request.urlopen(f"{BASE}/openapi.json", timeout=5)
    schema = json.loads(r.read().decode())
    paths = list(schema.get("paths", {}).keys())
    chat_paths = [p for p in paths if "/chat/" in p]
    print(f"  Total routes: {len(paths)}")
    print(f"  Chat routes: {len(chat_paths)}")
    for p in chat_paths:
        methods = list(schema["paths"][p].keys())
        method_str = ", ".join(m.upper() for m in methods)
        print(f"    {method_str:10s} {p}")
    ok = len(chat_paths) >= 5
    results.append(("OpenAPI chat routes", ok))
    if ok:
        print("  [PASS] All 5+ chat routes found")
    else:
        print("  [FAIL] Expected 5+ chat routes")
except Exception as e:
    print(f"  Error: {e}")
    results.append(("OpenAPI", False))

# Test 3: No auth token -> should get 401 or 403
print()
s = test("Test 3: Start session (no auth)", "POST", "/v1/chat/sessions",
         body={"agent_id": "00000000-0000-0000-0000-000000000000"},
         expect=401)
results.append(("Auth guard (no token)", s in (401, 403)))

# Test 4: Bad body -> should get 422
print()
s = test("Test 4: Start session (bad body)", "POST", "/v1/chat/sessions",
         body={"wrong_field": "test"},
         headers={"Authorization": "Bearer fake-token"},
         expect=422)
results.append(("Validation (bad body)", s == 422))

# Test 5: Send message to non-existent session
print()
s = test("Test 5: Message to missing session", "POST",
         "/v1/chat/sessions/00000000-0000-0000-0000-000000000000/messages",
         body={"content": "hello"},
         headers={"Authorization": "Bearer fake-token"})
results.append(("Missing session guard", s in (401, 403, 404)))

# Test 6: Whisper to non-existent session
print()
s = test("Test 6: Whisper to missing session", "POST",
         "/v1/chat/sessions/00000000-0000-0000-0000-000000000000/whisper",
         body={"content": "offer discount"},
         headers={"Authorization": "Bearer fake-token"})
results.append(("Whisper guard", s in (401, 403, 404)))

# Test 7: End non-existent session
print()
s = test("Test 7: End missing session", "POST",
         "/v1/chat/sessions/00000000-0000-0000-0000-000000000000/end",
         headers={"Authorization": "Bearer fake-token"})
results.append(("End session guard", s in (401, 403, 404)))

# Test 8: SSE stream for non-existent session
print()
s = test("Test 8: SSE stream missing session", "GET",
         "/v1/chat/sessions/00000000-0000-0000-0000-000000000000/stream",
         headers={"Authorization": "Bearer fake-token"})
results.append(("SSE guard", s in (401, 403, 404)))

# Test 9: Get messages for non-existent session
print()
s = test("Test 9: Get messages", "GET",
         "/v1/chat/sessions/00000000-0000-0000-0000-000000000000/messages",
         headers={"Authorization": "Bearer fake-token"})
results.append(("Get messages", s in (200, 401, 403, 404)))

# Summary
print()
print("=" * 50)
print("  ENDPOINT TEST SUMMARY")
print("=" * 50)
passed = 0
for name, ok in results:
    status = "[PASS]" if ok else "[FAIL]"
    print(f"  {status}  {name}")
    if ok:
        passed += 1
print()
print(f"  {passed}/{len(results)} tests passed")
print("=" * 50)
