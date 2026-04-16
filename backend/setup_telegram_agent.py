#!/usr/bin/env python
"""Update an agent with Telegram configuration."""

import sys
import os
import json
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from app.db.supabase import get_supabase_service_client

print("=" * 100)
print("🤖 SETUP TELEGRAM FOR AN AGENT")
print("=" * 100)

# Get list of agents
db = get_supabase_service_client()

try:
    agents_res = db.table("agents").select("id, name, agent_type").execute()
    agents = agents_res.data if agents_res.data else []
except Exception as e:
    print(f"❌ Error fetching agents: {e}")
    sys.exit(1)

if not agents:
    print("❌ No agents found")
    sys.exit(1)

# Show available agents
print(f"\n📋 Available agents ({len(agents)}):\n")
for i, agent in enumerate(agents, 1):
    print(f"{i}. {agent['name']} ({agent['agent_type']}) - ID: {agent['id']}")

# Get user input
print("\n" + "=" * 100)
agent_num = input("Enter agent number (1-{}): ".format(len(agents)))

try:
    agent_num = int(agent_num)
    if agent_num < 1 or agent_num > len(agents):
        print("❌ Invalid agent number")
        sys.exit(1)
except ValueError:
    print("❌ Please enter a valid number")
    sys.exit(1)

selected_agent = agents[agent_num - 1]
print(f"\n✅ Selected: {selected_agent['name']}")

# Get Telegram token
print("\n" + "=" * 100)
telegram_token = input("Enter Telegram Bot Token (from BotFather): ").strip()

if not telegram_token:
    print("❌ Token cannot be empty")
    sys.exit(1)

if not telegram_token.startswith(("123", "456", "789", "6", "7", "8", "9")):
    response = input(f"\n⚠️  Token looks unusual: {telegram_token[:30]}...\nContinue anyway? (y/n): ")
    if response.lower() != 'y':
        print("❌ Operation cancelled")
        sys.exit(1)

# Update agent
print("\n" + "=" * 100)
print(f"📝 Updating agent: {selected_agent['name']}...")

try:
    # Build update payload
    webhook_configs = {
        "telegram": {
            "enabled": True,
            "bot_token": telegram_token
        },
        "whatsapp": {
            "enabled": False,
            "phone_number": None,
            "api_token": None,
            "provider": None
        },
        "instagram": {
            "enabled": False,
            "business_account_id": None,
            "api_token": None
        }
    }
    
    # Update via Supabase
    update_res = db.table("agents").update({
        "telegram_bot_token": telegram_token,
        "webhook_configs": webhook_configs
    }).eq("id", selected_agent["id"]).execute()
    
    if update_res.data:
        print(f"✅ Successfully updated agent!")
        print(f"\n📊 Configuration saved:")
        print(f"   - Agent: {selected_agent['name']}")
        print(f"   - Bot Token: {telegram_token[:20]}***")
        print(f"   - Telegram Enabled: True")
        print(f"\n✅ Next steps:")
        print(f"   1. Verify the webhook URL is set in your Telegram bot settings")
        print(f"   2. Set webhook with BotFather: /setwebhook")
        print(f"   3. Send a test message to your bot (https://t.me/your_bot)")
        print(f"   4. Check backend logs for incoming webhook events")
        print(f"\n💡 Webhook URL should be: https://your-domain.com/api/v1/telegram/webhook/{selected_agent['id']}")
    else:
        print(f"❌ Update failed: No data returned")
        
except Exception as e:
    print(f"❌ Error updating agent: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("\n" + "=" * 100)
