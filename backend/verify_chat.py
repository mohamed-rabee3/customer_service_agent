"""
Dry verification — checks all chat agent code imports and structure.
No API keys, no server, no network needed.
"""
import sys
import importlib
import os

# Set dummy env vars so pydantic-settings doesn't complain
os.environ.setdefault("SUPABASE_URL", "https://dummy.supabase.co")
os.environ.setdefault("SUPABASE_KEY", "dummy-key")
os.environ.setdefault("SUPABASE_SERVICE_KEY", "dummy-service-key")
os.environ.setdefault("SECRET_KEY", "dummy-secret")
os.environ.setdefault("OPENROUTER_API_KEY", "dummy-openrouter-key")

# Add the backend directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

passed = 0
failed = 0

def check(label, fn):
    global passed, failed
    try:
        fn()
        print(f"  [PASS] {label}")
        passed += 1
    except Exception as e:
        print(f"  [FAIL] {label}")
        print(f"         Error: {e}")
        failed += 1

print()
print("  +==============================================+")
print("  |   Chat Agent - Dry Code Verification         |")
print("  +==============================================+")
print()

# --- 1. Config ---
print("  -- Config & Core --")
check("core.config loads", lambda: importlib.import_module("app.core.config"))
check("config has openrouter_api_key", lambda: (
    hasattr(importlib.import_module("app.core.config").settings, "openrouter_api_key")
    or (_ for _ in ()).throw(AssertionError("missing openrouter_api_key"))
))
check("config has openrouter_model", lambda: (
    hasattr(importlib.import_module("app.core.config").settings, "openrouter_model")
    or (_ for _ in ()).throw(AssertionError("missing openrouter_model"))
))

# --- 2. LLM ---
print("\n  -- LLM Integration --")
check("openrouter_llm module loads", lambda: importlib.import_module("app.agents.llm.openrouter_llm"))
check("OpenRouterLLM class exists", lambda: (
    getattr(importlib.import_module("app.agents.llm.openrouter_llm"), "OpenRouterLLM")
))
def check_llm_methods():
    cls = importlib.import_module("app.agents.llm.openrouter_llm").OpenRouterLLM
    instance = cls()
    assert hasattr(instance, "send_message_stream"), "missing send_message_stream"
    assert hasattr(instance, "send_message"), "missing send_message"
    assert callable(instance.send_message_stream), "send_message_stream not callable"
    assert callable(instance.send_message), "send_message not callable"
check("OpenRouterLLM has stream + send methods", check_llm_methods)

# --- 3. Sentiment Analyzer ---
print("\n  -- Sentiment Analyzer --")
check("sentiment_analyzer module loads", lambda: importlib.import_module("app.agents.processors.sentiment_analyzer"))
check("SentimentAnalyzer class exists", lambda: (
    getattr(importlib.import_module("app.agents.processors.sentiment_analyzer"), "SentimentAnalyzer")
))
def check_sentiment_methods():
    cls = importlib.import_module("app.agents.processors.sentiment_analyzer").SentimentAnalyzer
    instance = cls()
    assert hasattr(instance, "analyze"), "missing analyze method"
check("SentimentAnalyzer has analyze method", check_sentiment_methods)

# --- 4. Chat Agent ---
print("\n  -- Chat Agent Core --")
check("chat_agent module loads", lambda: importlib.import_module("app.agents.chat_agent"))
check("ChatAgent class exists", lambda: (
    getattr(importlib.import_module("app.agents.chat_agent"), "ChatAgent")
))
def check_chat_agent():
    from uuid import uuid4
    cls = importlib.import_module("app.agents.chat_agent").ChatAgent
    agent = cls(
        agent_id=uuid4(),
        interaction_id=uuid4(),
        system_prompt="You are a helpful assistant.",
        agent_name="TestAgent",
    )
    assert hasattr(agent, "process_message"), "missing process_message"
    assert hasattr(agent, "analyze_sentiment"), "missing analyze_sentiment"
    assert hasattr(agent, "inject_whisper"), "missing inject_whisper"
    assert hasattr(agent, "end_session"), "missing end_session"
    assert hasattr(agent, "get_conversation_history"), "missing get_conversation_history"
    assert agent.is_active is True, "should be active initially"
    assert len(agent.messages) == 1, "should have 1 system message"
    assert agent.messages[0]["role"] == "system", "first msg should be system"
    # Test whisper injection
    agent.inject_whisper("Offer a discount")
    assert len(agent.messages) == 2, "should have 2 messages after whisper"
    assert "SUPERVISOR INSTRUCTION" in agent.messages[1]["content"]
    # Test end session
    agent.end_session()
    assert agent.is_active is False, "should be inactive after end"
check("ChatAgent instantiation + methods + whisper + end", check_chat_agent)

# --- 5. Agent Runner ---
print("\n  -- Agent Runner --")
check("agent_runner module loads", lambda: importlib.import_module("app.agents.agent_runner"))
check("AgentRunner class exists", lambda: (
    getattr(importlib.import_module("app.agents.agent_runner"), "AgentRunner")
))
def check_runner_methods():
    cls = importlib.import_module("app.agents.agent_runner").AgentRunner
    assert hasattr(cls, "start_session"), "missing start_session"
    assert hasattr(cls, "get_session"), "missing get_session"
    assert hasattr(cls, "end_session"), "missing end_session"
    assert hasattr(cls, "broadcast_event"), "missing broadcast_event"
    assert hasattr(cls, "subscribe"), "missing subscribe"
    assert hasattr(cls, "unsubscribe"), "missing unsubscribe"
check("AgentRunner has all class methods", check_runner_methods)

# --- 6. Schemas ---
print("\n  -- API Schemas --")
check("chat schemas module loads", lambda: importlib.import_module("app.api.v1.schemas.chat"))
def check_schemas():
    mod = importlib.import_module("app.api.v1.schemas.chat")
    for name in ["StartChatRequest", "StartChatResponse", "SendMessageRequest",
                  "WhisperRequest", "ChatMessageResponse", "ChatSessionStatus"]:
        assert hasattr(mod, name), f"missing schema: {name}"
check("All 6 schemas exist", check_schemas)

# --- 7. Endpoints ---
print("\n  -- API Endpoints --")
check("chat endpoints module loads", lambda: importlib.import_module("app.api.v1.endpoints.chat"))
check("chat_sse endpoints module loads", lambda: importlib.import_module("app.api.v1.endpoints.chat_sse"))
def check_routes():
    chat = importlib.import_module("app.api.v1.endpoints.chat")
    sse = importlib.import_module("app.api.v1.endpoints.chat_sse")
    assert hasattr(chat, "router"), "chat module missing router"
    assert hasattr(sse, "router"), "chat_sse module missing router"
    chat_routes = [r.path for r in chat.router.routes]
    sse_routes = [r.path for r in sse.router.routes]
    assert "/chat/sessions" in chat_routes, f"missing /sessions route, found: {chat_routes}"
    assert "/chat/sessions/{session_id}/messages" in chat_routes, "missing messages route"
    assert "/chat/sessions/{session_id}/end" in chat_routes, "missing end route"
    assert "/chat/sessions/{session_id}/whisper" in chat_routes, "missing whisper route"
    assert "/chat/sessions/{session_id}/stream" in sse_routes, "missing SSE stream route"
check("All 5 routes registered", check_routes)

# --- 8. Router ---
print("\n  -- Main Router --")
check("router module loads", lambda: importlib.import_module("app.api.v1.router"))
def check_main_router():
    mod = importlib.import_module("app.api.v1.router")
    router = mod.api_router
    paths = [r.path for r in router.routes]
    # Check chat routes are registered (they include prefix)
    has_chat = any("/chat" in p for p in paths)
    assert has_chat, f"chat routes not found in main router. Paths: {paths}"
check("Chat routes in main router", check_main_router)

# --- Summary ---
print()
print("  +==============================================+")
total = passed + failed
if failed == 0:
    print(f"  |   ALL {passed}/{total} CHECKS PASSED!                   |")
else:
    print(f"  |   {passed}/{total} passed, {failed} FAILED                  |")
print("  +==============================================+")
print()
