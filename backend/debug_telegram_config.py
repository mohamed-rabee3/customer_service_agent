#!/usr/bin/env python
"""Debug Telegram configuration for all agents."""

import sys
import os
import json
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from app.db.supabase import get_supabase_service_client

print("=" * 100)
print("🔍 COMPREHENSIVE TELEGRAM CONFIGURATION DEBUG")
print("=" * 100)

db = get_supabase_service_client()

# Get all agents with full details
print("\n📋 Fetching all agents...")
try:
    agents_res = db.table("agents").select(
        "id, name, status, agent_type, telegram_bot_token, webhook_configs, created_at"
    ).execute()
    
    agents = agents_res.data if agents_res.data else []
    print(f"✅ Found {len(agents)} agents\n")
    
except Exception as e:
    print(f"❌ Error fetching agents: {e}")
    sys.exit(1)

if not agents:
    print("⚠️  No agents found in database")
    sys.exit(0)

# Analyze each agent
telegram_ready = []
telegram_partial = []
telegram_missing = []

for agent in agents:
    agent_id = agent['id']
    agent_name = agent['name']
    old_token = agent.get('telegram_bot_token')
    webhook_configs = agent.get('webhook_configs')
    
    print(f"\n{'─' * 100}")
    print(f"Agent: {agent_name} ({agent_id})")
    print(f"Status: {agent['status']} | Type: {agent['agent_type']}")
    
    # Check old token column
    if old_token:
        print(f"  ✅ OLD Column (telegram_bot_token): {old_token[:20]}***")
    else:
        print(f"  ❌ OLD Column (telegram_bot_token): NOT SET")
    
    # Check new webhook_configs
    if webhook_configs:
        try:
            if isinstance(webhook_configs, str):
                wc = json.loads(webhook_configs)
            else:
                wc = webhook_configs
            
            telegram_config = wc.get('telegram', {})
            print(f"  📱 WEBHOOK Config (telegram):")
            print(f"     - Enabled: {telegram_config.get('enabled')}")
            print(f"     - Bot Token: {telegram_config.get('bot_token', 'NOT SET')}")
            if telegram_config.get('bot_token'):
                print(f"       Token: {str(telegram_config.get('bot_token'))[:20]}***")
        except Exception as e:
            print(f"  ⚠️  Error parsing webhook_configs: {e}")
            print(f"     Raw: {webhook_configs}")
    else:
        print(f"  ❌ WEBHOOK Config: NOT SET (null)")
    
    # Categorize
    has_old_token = bool(old_token)
    has_new_config = False
    new_enabled = False
    
    if webhook_configs:
        try:
            if isinstance(webhook_configs, str):
                wc = json.loads(webhook_configs)
            else:
                wc = webhook_configs
            tg = wc.get('telegram', {})
            has_new_config = bool(tg.get('bot_token'))
            new_enabled = tg.get('enabled', False)
        except:
            pass
    
    if (has_old_token or has_new_config) and new_enabled:
        telegram_ready.append((agent_name, agent_id))
        print(f"  ✅ STATUS: READY FOR TELEGRAM")
    elif has_old_token or has_new_config:
        telegram_partial.append((agent_name, agent_id))
        print(f"  ⚠️  STATUS: PARTIAL (token exists but not enabled or migration incomplete)")
    else:
        telegram_missing.append((agent_name, agent_id))
        print(f"  ❌ STATUS: NOT CONFIGURED")

print(f"\n\n{'=' * 100}")
print(f"SUMMARY REPORT")
print(f"{'=' * 100}")
print(f"\n✅ READY FOR TELEGRAM ({len(telegram_ready)}):")
if telegram_ready:
    for name, aid in telegram_ready:
        print(f"   - {name} ({aid})")
else:
    print(f"   None")

print(f"\n⚠️  PARTIAL CONFIGURATION ({len(telegram_partial)}):")
if telegram_partial:
    for name, aid in telegram_partial:
        print(f"   - {name} ({aid})")
else:
    print(f"   None")

print(f"\n❌ NOT CONFIGURED ({len(telegram_missing)}):")
if telegram_missing:
    for name, aid in telegram_missing:
        print(f"   - {name} ({aid})")
else:
    print(f"   None")

print(f"\n{'=' * 100}")
print(f"🔧 RECOMMENDATIONS:")
print(f"{'=' * 100}")

if len(telegram_ready) == 0 and len(telegram_partial) == 0:
    print("\n1. No agents have Telegram tokens configured")
    print("2. To add Telegram support to an agent:")
    print("   - Update the telegram_bot_token column with your bot token")
    print("   - OR update webhook_configs with the new format:")
    print('     {"telegram": {"enabled": true, "bot_token": "YOUR_TOKEN"}}')
    print("3. Create a Telegram bot: https://www.telegram.org/blog/bot-revolution")
    print("4. Get the bot token and set it in the agent")
elif len(telegram_ready) == 0:
    print("\n1. You have agents with tokens but they're not enabled in webhook_configs")
    print("2. Migration may have failed - check if webhook_configs column exists")
    print("3. Run the migration: db/005_add_webhook_configs.sql")
else:
    print(f"\n✅ You have {len(telegram_ready)} agent(s) ready for Telegram!")
    print("✓ Make sure your webhook is set up and receiving messages")
    print("✓ Check the Telegram bot logs for incoming messages")

print(f"\n{'=' * 100}\n")
