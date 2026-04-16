#!/usr/bin/env python
"""Check if webhook has been set and test telegram connectivity."""

import sys
import os
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from app.db.supabase import get_supabase_service_client

print("=" * 80)
print("🧪 TESTING TELEGRAM WEBHOOK SETUP")
print("=" * 80)

db = get_supabase_service_client()

# Get agents with tokens
agents_res = db.table("agents").select("id, name, telegram_bot_token, status").not_.is_("telegram_bot_token", "null").execute()

if not agents_res.data:
    print("❌ No agents with tokens found!")
    sys.exit(1)

# Filter out empty tokens
agents_with_tokens = [a for a in agents_res.data if a.get("telegram_bot_token") and a["telegram_bot_token"].strip()]

if not agents_with_tokens:
    print("❌ No agents with valid tokens found!")
    sys.exit(1)

print(f"\n✅ Found {len(agents_with_tokens)} agent(s) with tokens\n")

# Check each agent
for agent in agents_with_tokens:
    agent_id = agent["id"]
    name = agent["name"]
    status = agent["status"]
    token = agent["telegram_bot_token"]
    
    print(f"📍 Agent: {name}")
    print(f"   ID: {agent_id}")
    print(f"   Status: {status}")
    print(f"   Token: {token[:20]}...")
    
    # Check if there are any chat messages for this agent
    messages_res = db.table("chat_messages").select("id").eq("interaction_id", "").limit(100).execute()
    
    # Check interactions for this agent
    interactions_res = db.table("interactions").select("id, status, started_at").eq("agent_id", str(agent_id)).order("started_at", desc=True).limit(5).execute()
    
    if interactions_res.data:
        print(f"   ✅ Interactions found: {len(interactions_res.data)}")
        for inter in interactions_res.data:
            msg_res = db.table("chat_messages").select("id").eq("interaction_id", str(inter["id"])).execute()
            print(f"      - ID: {inter['id']}")
            print(f"        Status: {inter['status']}")
            print(f"        Messages: {len(msg_res.data) if msg_res.data else 0}")
    else:
        print(f"   ⚠️  No interactions yet")
    
    # Check what the webhook URL should be
    print(f"   🔗 Webhook URL should be: /v1/telegram/{agent_id}")
    print()

print("=" * 80)
print("✅ Setup looks correct!")
print("\nNext steps:")
print("1. Make sure backend is running: python run_dev.py")
print("2. Send a message to your Telegram bot")
print("3. Check backend logs for any errors")
print("=" * 80)
