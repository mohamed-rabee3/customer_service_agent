#!/usr/bin/env python
"""Check which agents have Telegram tokens configured."""

import sys
import os
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from app.db.supabase import get_supabase_service_client

print("=" * 80)
print("📋 CHECKING TELEGRAM AGENTS")
print("=" * 80)

db = get_supabase_service_client()

# Get all agents
all_agents = db.table("agents").select("id, name, supervisor_id, status, telegram_bot_token, agent_type").execute()

if not all_agents.data:
    print("❌ No agents found in database!")
    sys.exit(1)

print(f"\n✅ Found {len(all_agents.data)} total agents\n")

# Separate agents with and without tokens
with_token = []
without_token = []

for agent in all_agents.data:
    if agent.get("telegram_bot_token") and agent["telegram_bot_token"].strip():
        with_token.append(agent)
    else:
        without_token.append(agent)

# Display agents with tokens
print(f"🤖 AGENTS WITH TELEGRAM TOKEN ({len(with_token)}):")
print("-" * 80)
if with_token:
    for i, agent in enumerate(with_token, 1):
        token = agent.get("telegram_bot_token", "")
        token_masked = token[:15] + "***" if len(token) > 15 else token
        print(f"{i}. {agent['name']}")
        print(f"   ID: {agent['id']}")
        print(f"   Status: {agent['status']}")
        print(f"   Type: {agent['agent_type']}")
        print(f"   Token: {token_masked}")
        print()
else:
    print("   ❌ None\n")

# Display agents without tokens
print(f"⚠️  AGENTS WITHOUT TELEGRAM TOKEN ({len(without_token)}):")
print("-" * 80)
if without_token:
    for i, agent in enumerate(without_token, 1):
        print(f"{i}. {agent['name']}")
        print(f"   ID: {agent['id']}")
        print(f"   Status: {agent['status']}")
        print(f"   Type: {agent['agent_type']}")
        print()
else:
    print("   ✅ All agents have tokens!\n")

print("=" * 80)
if with_token:
    print(f"✅ {len(with_token)} agent(s) ready for Telegram integration")
else:
    print("❌ No agents configured for Telegram!")
print("=" * 80)
