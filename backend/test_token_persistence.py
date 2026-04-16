#!/usr/bin/env python
"""Test database persistence of Telegram token."""

import sys
import os
import json
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from uuid import UUID
from app.db.supabase import get_supabase_service_client

if len(sys.argv) < 2:
    print("Usage: python test_token_persistence.py <agent_number>")
    
    db = get_supabase_service_client()
    agents_res = db.table("agents").select("id, name, telegram_bot_token").execute()
    agents = agents_res.data if agents_res.data else []
    
    print(f"\nAvailable agents:\n")
    for i, agent in enumerate(agents, 1):
        token = agent.get('telegram_bot_token', '')
        token_display = f"{token[:20]}..." if token else "NOT SET"
        print(f"{i}. {agent['name']:<30} Token: {token_display}")
    
    sys.exit(1)

agent_num = int(sys.argv[1])

db = get_supabase_service_client()

agents_res = db.table("agents").select("id, name, telegram_bot_token, webhook_configs").execute()
agents = agents_res.data if agents_res.data else []

if agent_num < 1 or agent_num > len(agents):
    print(f"❌ Invalid agent number")
    sys.exit(1)

agent = agents[agent_num - 1]
agent_id = agent['id']

print("=" * 100)
print(f"🔍 TESTING DATABASE PERSISTENCE")
print("=" * 100)
print(f"\nAgent: {agent['name']}")
print(f"ID: {agent_id}\n")

# Step 1: Check current state
print("Step 1️⃣  Current database state:")
print(f"  telegram_bot_token: {agent.get('telegram_bot_token', 'NOT SET')}")
wc = agent.get('webhook_configs')
if isinstance(wc, str):
    wc = json.loads(wc)
if wc:
    print(f"  webhook_configs.telegram.enabled: {wc.get('telegram', {}).get('enabled')}")
    print(f"  webhook_configs.telegram.bot_token: {wc.get('telegram', {}).get('bot_token', 'NOT SET')}")

# Step 2: Simulate update - build new data like the service does
print("\nStep 2️⃣  Simulating service update (like UpdateAgentRequest):")
new_token = "testtoken123:ABCDEFGH1234567890IJKLMNOP"
print(f"  Setting telegram_bot_token to: {new_token[:20]}...\n")

# This is what happens in update_agent()
webhook_configs = wc or {}
if "telegram" not in webhook_configs:
    webhook_configs["telegram"] = {}
webhook_configs["telegram"]["bot_token"] = new_token
webhook_configs["telegram"]["enabled"] = True

print(f"  webhook_configs after merge:")
print(f"    - telegram.enabled: {webhook_configs['telegram']['enabled']}")
print(f"    - telegram.bot_token: {webhook_configs['telegram']['bot_token'][:20]}...")

# Step 3: Perform the database update
print("\nStep 3️⃣  Updating database:")
update_payload = {
    "telegram_bot_token": new_token,
    "webhook_configs": webhook_configs
}
print(f"  Payload being sent to database:")
print(f"    {json.dumps(update_payload, indent=6)}")

try:
    result = db.table("agents").update(update_payload).eq("id", agent_id).execute()
    
    if result.data:
        print(f"\n  ✅ Update response received:")
        updated = result.data[0]
        print(f"     telegram_bot_token: {updated.get('telegram_bot_token', 'NOT SET')}")
    else:
        print(f"\n  ❌ No data returned from update")
except Exception as e:
    print(f"\n  ❌ Error: {e}")
    sys.exit(1)

# Step 4: Verify by re-reading from database
print("\nStep 4️⃣  Verifying by re-reading from database:")
verify_res = db.table("agents").select("id, telegram_bot_token, webhook_configs").eq("id", agent_id).limit(1).execute()

if verify_res.data:
    verified = verify_res.data[0]
    stored_token = verified.get('telegram_bot_token')
    stored_wc = verified.get('webhook_configs')
    
    if isinstance(stored_wc, str):
        stored_wc = json.loads(stored_wc)
    
    print(f"  ✅ Data read from database:")
    print(f"     telegram_bot_token: {stored_token if stored_token else 'NOT SET'}")
    if stored_wc:
        print(f"     webhook_configs.telegram.enabled: {stored_wc.get('telegram', {}).get('enabled')}")
        print(f"     webhook_configs.telegram.bot_token: {stored_wc.get('telegram', {}).get('bot_token', 'NOT SET')}")
    
    # Verify match
    print(f"\n✅ VERIFICATION:")
    if stored_token == new_token:
        print(f"  ✅ telegram_bot_token matches!")
    else:
        print(f"  ❌ telegram_bot_token MISMATCH!")
        print(f"     Expected: {new_token}")
        print(f"     Got: {stored_token}")
    
    if stored_wc and stored_wc.get('telegram', {}).get('bot_token') == new_token:
        print(f"  ✅ webhook_configs.telegram.bot_token matches!")
    else:
        print(f"  ❌ webhook_configs.telegram MISMATCH!")
        print(f"     Expected: {new_token}")
        print(f"     Got: {stored_wc.get('telegram', {}).get('bot_token')}")
else:
    print(f"  ❌ Could not read from database")

print("\n" + "=" * 100)
