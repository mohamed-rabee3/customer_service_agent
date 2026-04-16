#!/usr/bin/env python
"""Test agent update with Telegram token."""

import sys
import os
import json
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from uuid import UUID
from app.db.supabase import get_supabase_service_client

# Get the Telegram token from command line
if len(sys.argv) < 2:
    print("Usage: python test_update_telegram.py <agent_number> [telegram_token]")
    print("\nExample: python test_update_telegram.py 1")
    print("         python test_update_telegram.py 2 8627012748:AAGxCvcIEoR8HZu2uL64GQwmHIv9MWXDL_0")
    
    # Show available agents
    db = get_supabase_service_client()
    agents_res = db.table("agents").select("id, name, agent_type").execute()
    agents = agents_res.data if agents_res.data else []
    
    print("\nAvailable agents:")
    for i, agent in enumerate(agents, 1):
        print(f"  {i}. {agent['name']} ({agent['agent_type']}) - ID: {agent['id']}")
    
    sys.exit(1)

agent_num = int(sys.argv[1])
telegram_token = sys.argv[2] if len(sys.argv) > 2 else "8627012748:AAGxCvcIEoR8HZu2uL64GQwmHIv9MWXDL_0"

# Get database connection
db = get_supabase_service_client()

# Get agents
agents_res = db.table("agents").select("id, name, agent_type, telegram_bot_token, webhook_configs").execute()
agents = agents_res.data if agents_res.data else []

if agent_num < 1 or agent_num > len(agents):
    print(f"❌ Invalid agent number. Please select 1-{len(agents)}")
    sys.exit(1)

agent = agents[agent_num - 1]
agent_id = agent['id']

print("=" * 100)
print(f"🧪 TEST UPDATE AGENT WITH TELEGRAM TOKEN")
print("=" * 100)
print(f"\nAgent:  {agent['name']}")
print(f"Type:   {agent['agent_type']}")
print(f"ID:     {agent_id}")
print(f"Token:  {telegram_token[:20]}***")

# Build webhook configs
webhook_configs = agent.get('webhook_configs') or {}
if not webhook_configs:
    webhook_configs = {
        "telegram": {"enabled": False, "bot_token": None},
        "whatsapp": {"enabled": False, "phone_number": None, "api_token": None, "provider": None},
        "instagram": {"enabled": False, "business_account_id": None, "api_token": None}
    }

print(f"\n📝 Before update:")
print(f"   telegram_bot_token: {agent.get('telegram_bot_token', 'NOT SET')}")
if isinstance(webhook_configs, str):
    wc = json.loads(webhook_configs)
else:
    wc = webhook_configs
print(f"   webhook_configs.telegram.enabled: {wc.get('telegram', {}).get('enabled')}")
print(f"   webhook_configs.telegram.bot_token: {wc.get('telegram', {}).get('bot_token')}")

# Update the agent
try:
    # Build update payload - set both old and new format
    webhook_configs["telegram"] = {
        "enabled": True,
        "bot_token": telegram_token
    }
    
    result = db.table("agents").update({
        "telegram_bot_token": telegram_token,
        "webhook_configs": webhook_configs
    }).eq("id", agent_id).execute()
    
    if result.data:
        print(f"\n✅ UPDATE SUCCESSFUL!")
        
        # Fetch updated agent to verify
        verify_res = db.table("agents").select(
            "id, name, telegram_bot_token, webhook_configs"
        ).eq("id", agent_id).execute()
        
        if verify_res.data:
            updated = verify_res.data[0]
            print(f"\n📊 After update (verification):")
            print(f"   telegram_bot_token: {updated.get('telegram_bot_token', 'NOT SET')}")
            
            wc_verify = updated.get('webhook_configs')
            if isinstance(wc_verify, str):
                wc_verify = json.loads(wc_verify)
            
            if wc_verify:
                print(f"   webhook_configs.telegram.enabled: {wc_verify.get('telegram', {}).get('enabled')}")
                print(f"   webhook_configs.telegram.bot_token: {str(wc_verify.get('telegram', {}).get('bot_token', 'NOT SET'))[:20]}***")
                
                if (updated.get('telegram_bot_token') == telegram_token and 
                    wc_verify.get('telegram', {}).get('enabled') == True and
                    wc_verify.get('telegram', {}).get('bot_token') == telegram_token):
                    print(f"\n✅ VERIFICATION PASSED! Token is saved in BOTH columns")
                else:
                    print(f"\n⚠️  VERIFICATION WARNING: Token may not be properly saved")
            else:
                print(f"   webhook_configs: NOT SET")
        else:
            print(f"\n⚠️  Could not verify update")
    else:
        print(f"❌ Update failed: No data returned")
        
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("\n" + "=" * 100)
