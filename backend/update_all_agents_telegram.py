#!/usr/bin/env python
"""Update ALL agents with Telegram token in database."""

import sys
import os
import json
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from app.db.supabase import get_supabase_service_client

if len(sys.argv) < 2:
    print("Usage: python update_all_agents_telegram.py <telegram_token>")
    print("\nExample: python update_all_agents_telegram.py 8627012748:AAGxCvcIEoR8HZu2uL64GQwmHIv9MWXDL_0")
    sys.exit(1)

telegram_token = sys.argv[1]

# Validate token format
if ':' not in telegram_token or len(telegram_token) < 20:
    print(f"❌ Invalid token format: {telegram_token[:20]}...")
    sys.exit(1)

db = get_supabase_service_client()

print("=" * 100)
print(f"🔄 UPDATING ALL AGENTS WITH TELEGRAM TOKEN")
print("=" * 100)
print(f"\nToken: {telegram_token[:20]}***\n")

# Get all agents
agents_res = db.table("agents").select("id, name, agent_type").execute()
agents = agents_res.data if agents_res.data else []

if not agents:
    print("❌ No agents found")
    sys.exit(1)

print(f"Found {len(agents)} agents to update:\n")

success_count = 0
fail_count = 0

for i, agent in enumerate(agents, 1):
    agent_id = agent['id']
    agent_name = agent['name']
    
    try:
        # Get current webhook_configs
        current = db.table("agents").select("webhook_configs").eq("id", agent_id).limit(1).execute()
        webhook_configs = current.data[0].get('webhook_configs') if current.data else {}
        
        if not webhook_configs:
            webhook_configs = {
                "telegram": {"enabled": False, "bot_token": None},
                "whatsapp": {"enabled": False, "phone_number": None, "api_token": None, "provider": None},
                "instagram": {"enabled": False, "business_account_id": None, "api_token": None}
            }
        
        if isinstance(webhook_configs, str):
            webhook_configs = json.loads(webhook_configs)
        
        # Update telegram config
        webhook_configs["telegram"] = {
            "enabled": True,
            "bot_token": telegram_token
        }
        
        # Update in database
        result = db.table("agents").update({
            "telegram_bot_token": telegram_token,
            "webhook_configs": webhook_configs
        }).eq("id", agent_id).execute()
        
        if result.data:
            print(f"  {i}. ✅ {agent_name:<30} ({agent['agent_type']})")
            success_count += 1
        else:
            print(f"  {i}. ❌ {agent_name:<30} ({agent['agent_type']}) - Update failed")
            fail_count += 1
    except Exception as e:
        print(f"  {i}. ❌ {agent_name:<30} ({agent['agent_type']}) - Error: {e}")
        fail_count += 1

print(f"\n{'=' * 100}")
print(f"✅ SUCCESS: {success_count}/{len(agents)} agents updated")
if fail_count > 0:
    print(f"❌ FAILED: {fail_count}/{len(agents)} agents")

print(f"\n📋 Next steps:")
print(f"   1. Run: .\venv\Scripts\python.exe check_telegram_agents.py")
print(f"   2. Verify all agents now have the Telegram token")
print(f"   3. Set webhooks in BotFather for each agent")
print(f"\n{'=' * 100}")
