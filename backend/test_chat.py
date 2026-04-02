"""
Chat Agent Test Script — Zero Dependencies
Uses only Python standard library (urllib, json, http.client).
Run: python test_chat.py

Prerequisites:
  1. Backend running: uvicorn app.main:app --reload
  2. .env has OPENROUTER_API_KEY set
  3. chat_messages table created in Supabase
  4. At least one agent exists in the database (status=idle, type=chat)
  
Usage:
  python test_chat.py                          # Full interactive flow
  python test_chat.py --token YOUR_JWT_TOKEN   # Skip login, use existing token
  python test_chat.py --agent-id UUID          # Specify agent ID directly
"""

import json
import sys
import http.client
import urllib.request
import urllib.error
import urllib.parse
import time
from typing import Optional

# ------------------------------------------
# Configuration
# ------------------------------------------
BASE_URL = "http://localhost:8000"
API_PREFIX = "/v1"

# Colors for terminal output (Windows compatible)
class C:
    GREEN = "\033[92m"
    RED = "\033[91m"
    YELLOW = "\033[93m"
    CYAN = "\033[96m"
    BOLD = "\033[1m"
    DIM = "\033[2m"
    END = "\033[0m"


def header(title: str):
    print(f"\n{C.BOLD}{C.CYAN}{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}{C.END}\n")


def success(msg: str):
    print(f"  {C.GREEN}[PASS] {msg}{C.END}")


def fail(msg: str):
    print(f"  {C.RED}[FAIL] {msg}{C.END}")


def info(msg: str):
    print(f"  {C.DIM}> {msg}{C.END}")


def warn(msg: str):
    print(f"  {C.YELLOW}[WARN] {msg}{C.END}")


# ------------------------------------------
# HTTP helpers (stdlib only)
# ------------------------------------------
def api_request(
    method: str,
    path: str,
    body: Optional[dict] = None,
    token: Optional[str] = None,
    stream: bool = False,
) -> dict:
    """Make an HTTP request to the API. Returns {status, data, raw}."""
    url = f"{BASE_URL}{API_PREFIX}{path}"
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"

    data = json.dumps(body).encode("utf-8") if body else None

    req = urllib.request.Request(url, data=data, headers=headers, method=method)

    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            status = resp.status
            if stream:
                # Read SSE stream line by line
                raw = resp.read().decode("utf-8")
                return {"status": status, "data": None, "raw": raw}
            else:
                raw = resp.read().decode("utf-8")
                try:
                    parsed = json.loads(raw)
                except json.JSONDecodeError:
                    parsed = raw
                return {"status": status, "data": parsed, "raw": raw}
    except urllib.error.HTTPError as e:
        body_text = e.read().decode("utf-8") if e.fp else ""
        try:
            err_data = json.loads(body_text)
        except json.JSONDecodeError:
            err_data = body_text
        return {"status": e.code, "data": err_data, "raw": body_text}
    except urllib.error.URLError as e:
        return {"status": 0, "data": None, "raw": str(e.reason)}


def sse_request(
    path: str,
    body: Optional[dict] = None,
    token: Optional[str] = None,
    method: str = "POST",
    timeout: float = 15,
) -> list[dict]:
    """
    Make an SSE request and collect events.
    Returns list of parsed SSE data chunks.
    """
    url = f"{BASE_URL}{API_PREFIX}{path}"
    headers = {
        "Content-Type": "application/json",
        "Accept": "text/event-stream",
    }
    if token:
        headers["Authorization"] = f"Bearer {token}"

    # Use http.client for streaming support
    parsed = urllib.parse.urlparse(url)
    conn = http.client.HTTPConnection(parsed.hostname, parsed.port, timeout=timeout)

    body_bytes = json.dumps(body).encode("utf-8") if body else None

    try:
        conn.request(method, parsed.path, body=body_bytes, headers=headers)
        resp = conn.getresponse()

        if resp.status != 200:
            error_body = resp.read().decode("utf-8")
            return [{"error": True, "status": resp.status, "body": error_body}]

        events = []
        buffer = ""
        start = time.time()

        while time.time() - start < timeout:
            chunk = resp.read(4096)
            if not chunk:
                break
            buffer += chunk.decode("utf-8")

            # Parse SSE events from buffer
            while "\n\n" in buffer:
                event_str, buffer = buffer.split("\n\n", 1)
                for line in event_str.split("\n"):
                    if line.startswith("data: "):
                        data_str = line[6:]
                        try:
                            events.append(json.loads(data_str))
                        except json.JSONDecodeError:
                            events.append({"raw": data_str})

        return events

    except Exception as e:
        return [{"error": True, "message": str(e)}]
    finally:
        conn.close()


# ------------------------------------------
# Test functions
# ------------------------------------------
def test_health():
    """Test 1: Health check."""
    header("Test 1: Health Check")
    resp = api_request("GET", "/../health")  # /health is outside /v1
    # Try the root health endpoint
    try:
        req = urllib.request.Request(f"{BASE_URL}/health")
        with urllib.request.urlopen(req, timeout=5) as r:
            data = json.loads(r.read().decode("utf-8"))
            if data.get("status") == "healthy":
                success(f"Server is healthy: {data}")
                return True
            else:
                fail(f"Unexpected response: {data}")
                return False
    except Exception as e:
        fail(f"Server not reachable: {e}")
        info("Make sure the backend is running: uvicorn app.main:app --reload")
        return False


def test_auth(token: str) -> bool:
    """Test 2: Auth check."""
    header("Test 2: Auth Verification")
    resp = api_request("GET", "/auth/me", token=token)
    if resp["status"] == 200:
        user = resp["data"]
        success(f"Authenticated as: {user.get('email', 'N/A')}")
        success(f"Role: {user.get('role', 'N/A')}")
        if user.get("role") == "supervisor":
            profile = user.get("profile", {})
            success(f"Supervisor type: {profile.get('supervisor_type', 'N/A')}")
        return True
    else:
        fail(f"Auth failed (HTTP {resp['status']}): {resp['data']}")
        return False


def test_start_session(token: str, agent_id: str) -> Optional[str]:
    """Test 3: Start a chat session."""
    header("Test 3: Start Chat Session")
    info(f"Agent ID: {agent_id}")

    resp = api_request("POST", "/chat/sessions", body={"agent_id": agent_id}, token=token)

    if resp["status"] == 201:
        data = resp["data"]
        session_id = data.get("session_id")
        success(f"Session started!")
        success(f"Session ID: {session_id}")
        success(f"Agent: {data.get('agent_name', 'N/A')}")
        return session_id
    else:
        fail(f"Failed (HTTP {resp['status']}): {resp['data']}")
        return None


def test_send_message(token: str, session_id: str, message: str) -> bool:
    """Test 4: Send a message and read SSE response."""
    header(f"Test 4: Send Message")
    info(f"Message: \"{message}\"")
    info(f"Session: {session_id}")

    events = sse_request(
        f"/chat/sessions/{session_id}/messages",
        body={"content": message},
        token=token,
        timeout=30,
    )

    if not events:
        fail("No SSE events received")
        return False

    if events[0].get("error"):
        fail(f"Request failed: {events[0]}")
        return False

    # Reconstruct the full response
    full_response = ""
    metrics = None
    done = False

    for event in events:
        if event.get("type") == "chunk":
            full_response += event.get("content", "")
        elif event.get("type") == "done":
            done = True
        elif event.get("type") == "metrics":
            metrics = event

    if full_response:
        success("AI Response received!")
        # Print response with wrapping
        print(f"\n  {C.CYAN}+--------------------------------------------------+{C.END}")
        # Wrap long lines
        words = full_response.split()
        line = "  | "
        for w in words:
            if len(line) + len(w) > 55:
                print(f"{C.CYAN}{line}{C.END}")
                line = "  | "
            line += w + " "
        if line.strip() != "|":
            print(f"  {C.CYAN}{line}{C.END}")
        print(f"  {C.CYAN}+--------------------------------------------------+{C.END}\n")
    else:
        fail("Empty response from AI")

    if done:
        success("Stream completed (done event received)")
    else:
        warn("No 'done' event received (may be timeout)")

    if metrics:
        success(f"Sentiment: {metrics.get('sentiment', 'N/A')}")
        success(f"Satisfaction: {metrics.get('satisfaction_score', 'N/A')}%")
        success(f"Feed: {metrics.get('feed_text', 'N/A')}")
    else:
        warn("No metrics received (sentiment analysis may have been slow)")

    return bool(full_response)


def test_get_messages(token: str, session_id: str) -> bool:
    """Test 5: Get message history."""
    header("Test 5: Get Message History")

    resp = api_request("GET", f"/chat/sessions/{session_id}/messages", token=token)

    if resp["status"] == 200:
        messages = resp["data"]
        success(f"Retrieved {len(messages)} messages")
        for msg in messages:
            role = msg.get("role", "?")
            content = msg.get("content", "")[:80]
            icon = "[C]" if role == "customer" else "[A]" if role == "agent" else "[S]"
            print(f"    {icon} [{role}] {content}{'...' if len(msg.get('content', '')) > 80 else ''}")
        return True
    else:
        fail(f"Failed (HTTP {resp['status']}): {resp['data']}")
        return False


def test_whisper(token: str, session_id: str) -> bool:
    """Test 6: Whisper inject."""
    header("Test 6: Whisper Inject")
    instruction = "Offer the customer a 10% discount for their patience."
    info(f"Injecting: \"{instruction}\"")

    resp = api_request(
        "POST",
        f"/chat/sessions/{session_id}/whisper",
        body={"content": instruction},
        token=token,
    )

    if resp["status"] == 200:
        success("Whisper injected successfully!")
        success(f"Response: {resp['data']}")
        return True
    else:
        fail(f"Failed (HTTP {resp['status']}): {resp['data']}")
        return False


def test_whisper_effect(token: str, session_id: str) -> bool:
    """Test 7: Send message after whisper to see if agent incorporates it."""
    header("Test 7: Post-Whisper Message (Agent Should Mention Discount)")
    msg = "I've been having trouble with my subscription for weeks now."

    return test_send_message(token, session_id, msg)


def test_end_session(token: str, session_id: str) -> bool:
    """Test 8: End the session."""
    header("Test 8: End Chat Session")

    resp = api_request("POST", f"/chat/sessions/{session_id}/end", token=token)

    if resp["status"] == 200:
        success(f"Session ended: {resp['data']}")
        return True
    else:
        fail(f"Failed (HTTP {resp['status']}): {resp['data']}")
        return False


def test_session_ended(token: str, session_id: str) -> bool:
    """Test 9: Verify session is actually ended."""
    header("Test 9: Verify Session Ended")

    resp = api_request(
        "POST",
        f"/chat/sessions/{session_id}/messages",
        body={"content": "Hello?"},
        token=token,
    )

    if resp["status"] == 404:
        success("Correctly rejected — session is ended (404)")
        return True
    else:
        fail(f"Unexpected status {resp['status']}: should be 404")
        return False


# ------------------------------------------
# Main runner
# ------------------------------------------
def main():
    print(f"\n{C.BOLD}{C.CYAN}")
    print("  +===============================================+")
    print("  |     Chat Agent Test Suite (Zero-Dep)         |")
    print("  +===============================================+")
    print(f"{C.END}")

    # Parse args
    token = None
    agent_id = None
    for i, arg in enumerate(sys.argv[1:], 1):
        if arg == "--token" and i < len(sys.argv) - 1:
            token = sys.argv[i + 1]
        elif arg == "--agent-id" and i < len(sys.argv) - 1:
            agent_id = sys.argv[i + 1]

    # Test 1: Health
    if not test_health():
        print(f"\n{C.RED}  Server not running. Aborting.{C.END}\n")
        sys.exit(1)

    # Get token if not provided
    if not token:
        print(f"\n{C.YELLOW}  No --token provided. Please enter your JWT token.")
        print(f"  (Get it from your browser: Supabase Auth → session.access_token){C.END}")
        token = input(f"\n  JWT Token: ").strip()
        if not token:
            fail("Token is required")
            sys.exit(1)

    # Test 2: Auth
    if not test_auth(token):
        sys.exit(1)

    # Get agent_id if not provided
    if not agent_id:
        print(f"\n{C.YELLOW}  No --agent-id provided.")
        print(f"  Enter the UUID of a chat agent (must be idle/chat type).{C.END}")
        agent_id = input(f"\n  Agent ID: ").strip()
        if not agent_id:
            fail("Agent ID is required")
            sys.exit(1)

    # Run test suite
    results = {}
    session_id = None

    # Test 3: Start session
    session_id = test_start_session(token, agent_id)
    results["Start Session"] = session_id is not None

    if not session_id:
        fail("Cannot continue without a session")
        _print_results(results)
        sys.exit(1)

    # Test 4: Send message
    results["Send Message"] = test_send_message(
        token, session_id, "Hello! I need help with my recent order #12345."
    )

    # Test 5: Get history
    results["Get Messages"] = test_get_messages(token, session_id)

    # Test 6: Whisper
    results["Whisper Inject"] = test_whisper(token, session_id)

    # Test 7: Post-whisper message
    results["Post-Whisper"] = test_whisper_effect(token, session_id)

    # Test 8: End session
    results["End Session"] = test_end_session(token, session_id)

    # Test 9: Verify ended
    results["Verify Ended"] = test_session_ended(token, session_id)

    # Print summary
    _print_results(results)


def _print_results(results: dict):
    header("Test Results Summary")
    passed = sum(1 for v in results.values() if v)
    total = len(results)

    for name, passed_test in results.items():
        icon = f"{C.GREEN}[PASS]" if passed_test else f"{C.RED}[FAIL]"
        print(f"  {icon}{C.END}  {name}")

    print()
    color = C.GREEN if passed == total else C.YELLOW if passed > 0 else C.RED
    print(f"  {color}{C.BOLD}{passed}/{total} tests passed{C.END}\n")


if __name__ == "__main__":
    main()
