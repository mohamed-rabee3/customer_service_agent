#!/usr/bin/env python
"""Directly update agent with Telegram token - NO INTERACTION REQUIRED."""

import sys
import os
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from app.db.supabase import get_supabase_service_client

if len(sys.argv) < 3:
    print("Usage: python update_telegram_token.py <agent_number> <telegram_token>")
    print("\nExample: python update_telegram_token.py 1 123456789:ABCdefGHIjklmnoPQRstuvWXYZ")
    print("\nAvailable agents:")
    
    db = get_supabase_service_client()
    agents_res = db.table("agents").select("id, name, agent_type").execute()
    agents = agents_res.data if agents_res.data else []
    
    for i, agent in enumerate(agents, 1):
        print(f"  {i}. {agent['name']} ({agent['agent_type']}) - ID: {agent['id']}")
    
    sys.exit(1)

agent_num = int(sys.argv[1])
telegram_token = sys.argv[2]

# Get database connection
db = get_supabase_service_client()

# Get agents
agents_res = db.table("agents").select("id, name, agent_type").execute()
agents = agents_res.data if agents_res.data else []

if agent_num < 1 or agent_num > len(agents):
    print(f"❌ Invalid agent number. Please select 1-{len(agents)}")
    sys.exit(1)

agent = agents[agent_num - 1]

print("=" * 100)
print(f"🔧 UPDATING TELEGRAM CONFIGURATION")
print("=" * 100)
print(f"\nAgent:  {agent['name']}")
print(f"Type:   {agent['agent_type']}")
print(f"ID:     {agent['id']}")
print(f"Token:  {telegram_token[:20]}***")
print()

# Update the agent
try:
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
    
    result = db.table("agents").update({
        "telegram_bot_token": telegram_token,
        "webhook_configs": webhook_configs
    }).eq("id", agent["id"]).execute()
    
    if result.data:
        print("✅ SUCCESSFULLY UPDATED!")
        print(f"\n📊 Configuration saved:")
        print(f"   - Agent: {agent['name']}")
        print(f"   - Bot Token: {telegram_token[:20]}***")
        print(f"   - Telegram Enabled: True")
        print(f"\n📋 NEXT STEPS:")
        print(f"   1. Go to Telegram BotFather (@BotFather)")
        print(f"   2. Select your bot and use /setwebhook command")
        print(f"   3. Enter your webhook URL:")
        print(f"      https://your-domain.com/api/v1/telegram/webhook/{agent['id']}")
        print(f"   4. Send a test message to your Telegram bot")
        print(f"   5. Check backend logs to see if webhook is received")
        print(f"\n💡 Common issues:")
        print(f"   - Domain must be HTTPS (Telegram requires it)")
        print(f"   - Webhook URL must be publicly accessible")
        print(f"   - Bot token must be correct")
    else:
        print(f"❌ Update failed: No data returned")
        
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("\n" + "=" * 100)
