#!/usr/bin/env python
"""
Telegram Integration Diagnostic Tool
Run this to verify your Telegram bot is properly configured and working!
"""

import os
import sys
import urllib.request
import urllib.error
import json
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent / "backend"))

def check_env_vars():
    """Check if environment variables are set."""
    print("\n🔍 CHECKING ENVIRONMENT VARIABLES...")
    print("=" * 60)
    
    env_file = Path("backend/.env")
    if not env_file.exists():
        print("❌ .env file not found!")
        return False
    
    env_content = env_file.read_text()
    
    checks = {
        "OPENROUTER_API_KEY": "OpenRouter API Key (for LLM)",
        "SUPABASE_URL": "Supabase URL",
        "SUPABASE_SERVICE_KEY": "Supabase Service Key",
    }
    
    all_good = True
    for key, desc in checks.items():
        has_key = key in env_content
        status = "✅" if has_key else "❌"
        print(f"{status} {key:<25} - {desc}")
        if not has_key:
            all_good = False
    
    return all_good


def check_backend_running():
    """Check if backend is running."""
    print("\n📱 CHECKING BACKEND SERVER...")
    print("=" * 60)
    
    try:
        response = urllib.request.urlopen("http://localhost:8000/health", timeout=2)
        data = json.loads(response.read().decode())
        print(f"✅ Backend is running: {data}")
        return True
    except Exception as e:
        print(f"❌ Backend not running: {e}")
        print("   💡 Start it with: python backend/run_dev.py")
        return False


def check_agents_in_database():
    """Check if agents are configured in database."""
    print("\n🤖 CHECKING AGENTS IN DATABASE...")
    print("=" * 60)
    
    try:
        os.environ.setdefault('SUPABASE_URL', 'https://wtcgejudonztjtdishft.supabase.co')
        os.environ.setdefault('SUPABASE_SERVICE_KEY', '')
        
        from app.db.supabase import get_supabase_service_client
        
        db = get_supabase_service_client()
        agents = db.table("agents").select("id, name, agent_type, telegram_bot_token").execute()
        
        if not agents.data:
            print("❌ No agents found in database")
            print("   💡 Create an agent in the dashboard first!")
            return False
        
        print(f"✅ Found {len(agents.data)} agent(s):")
        for agent in agents.data:
            token = agent.get("telegram_bot_token", "")
            has_token = "✅" if token and token.strip() else "❌"
            print(f"\n   Agent: {agent['name']}")
            print(f"   ├─ Type: {agent['agent_type']}")
            print(f"   ├─ ID: {agent['id']}")
            print(f"   └─ Telegram Token: {has_token} {('✓ Configured' if token and token.strip() else 'Not configured')}")
        
        return any(a.get("telegram_bot_token", "").strip() for a in agents.data)
        
    except Exception as e:
        print(f"❌ Error checking database: {e}")
        return False


def check_webhook_registration():
    """Check if webhook is registered with Telegram."""
    print("\n🌐 CHECKING TELEGRAM WEBHOOK...")
    print("=" * 60)
    
    try:
        from app.db.supabase import get_supabase_service_client
        
        db = get_supabase_service_client()
        agents = db.table("agents").select("telegram_bot_token").execute()
        
        if not agents.data:
            print("❌ No agents found")
            return False
        
        agent = next((a for a in agents.data if a.get("telegram_bot_token")), None)
        if not agent:
            print("❌ No agent with telegram token found")
            return False
        
        bot_token = agent["telegram_bot_token"]
        url = f"https://api.telegram.org/bot{bot_token}/getWebhookInfo"
        
        response = urllib.request.urlopen(url, timeout=5)
        data = json.loads(response.read().decode())
        
        if data.get("ok"):
            webhook_info = data.get("result", {})
            if webhook_info.get("url"):
                print(f"✅ Webhook is registered!")
                print(f"   URL: {webhook_info['url']}")
                print(f"   Last error time: {webhook_info.get('last_error_date', 'None')}")
                if webhook_info.get('last_error_message'):
                    print(f"   Last error: {webhook_info['last_error_message']}")
                return True
            else:
                print("❌ No webhook configured")
                print("   💡 Run: python backend/run_dev.py")
                return False
        else:
            print(f"❌ Telegram API error: {data.get('description')}")
            return False
            
    except Exception as e:
        print(f"❌ Error checking webhook: {e}")
        print("   Try running: python backend/run_dev.py")
        return False


def check_openrouter_connection():
    """Check if OpenRouter API is accessible."""
    print("\n🧠 CHECKING OPENROUTER API...")
    print("=" * 60)
    
    try:
        from app.core.config import settings
        
        if not settings.openrouter_api_key or settings.openrouter_api_key.startswith("sk-or-"):
            print("❌ OpenRouter API key not configured")
            print("   💡 Add OPENROUTER_API_KEY to .env file")
            return False
        
        print(f"✅ OpenRouter API key is configured")
        print(f"   Model: {settings.openrouter_model}")
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False


def main():
    """Run all checks."""
    print("\n" + "=" * 60)
    print("🤖 TELEGRAM BOT INTEGRATION DIAGNOSTIC TOOL")
    print("=" * 60)
    
    checks = [
        ("Environment Variables", check_env_vars),
        ("Backend Server", check_backend_running),
        ("Database Agents", check_agents_in_database),
        ("OpenRouter API", check_openrouter_connection),
        ("Telegram Webhook", check_webhook_registration),
    ]
    
    results = {}
    for name, check_func in checks:
        try:
            results[name] = check_func()
        except Exception as e:
            print(f"\n❌ Error running {name}: {e}")
            results[name] = False
    
    # Summary
    print("\n" + "=" * 60)
    print("📊 DIAGNOSTIC SUMMARY")
    print("=" * 60)
    
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    
    for name, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status:<10} {name}")
    
    print("\n" + "=" * 60)
    print(f"Result: {passed}/{total} checks passed")
    print("=" * 60)
    
    if passed == total:
        print("\n🎉 Everything looks good! Your Telegram bot should be working!")
        print("\nNext steps:")
        print("1. Open Telegram and send a message to your bot")
        print("2. Check the logs in your terminal for debug info")
        print("3. Monitor responses in the Chat Archive")
    else:
        print("\n⚠️  Some checks failed. Review the errors above and:")
        print("1. Make sure all environment variables are set")
        print("2. Start the backend with: python backend/run_dev.py")
        print("3. Create an agent with a Telegram token in the dashboard")
        print("4. Check logs for more details: cat backend/app.log")
    
    return 0 if passed == total else 1


if __name__ == "__main__":
    sys.exit(main())
