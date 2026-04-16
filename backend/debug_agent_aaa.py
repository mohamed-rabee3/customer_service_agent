#!/usr/bin/env python3
"""Debug script for agent 'aaa' issue"""

import os
import sys
from dotenv import load_dotenv
import asyncio

load_dotenv()

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__)))

from app.core.config import settings
from supabase import create_client

async def main():
    print("🔍 Debugging Agent 'aaa'...")
    print("-" * 60)
    
    # Initialize Supabase
    supabase = create_client(settings.supabase_url, settings.supabase_key)
    
    # 1. Check if agent exists
    print("\n1️⃣ Checking if agent 'aaa' exists...")
    try:
        response = supabase.table("agents").select("*").eq("name", "aaa").execute()
        if response.data:
            agent = response.data[0]
            print(f"✅ Agent found!")
            print(f"   ID: {agent.get('id')}")
            print(f"   Name: {agent.get('name')}")
            print(f"   Status: {agent.get('status')}")
            print(f"   Agent Type: {agent.get('agent_type')}")
            print(f"   System Prompt: {agent.get('system_prompt')[:100]}...")
            print(f"\n   Legacy telegram_bot_token: {agent.get('telegram_bot_token')}")
            print(f"\n   webhook_configs: {agent.get('webhook_configs')}")
            
            agent_id = agent.get('id')
            
            # 2. Check chat_messages table
            print(f"\n2️⃣ Checking chat messages for agent {agent_id}...")
            try:
                messages = supabase.table("chat_messages").select("*").eq("agent_id", agent_id).order("created_at", desc=True).limit(5).execute()
                if messages.data:
                    print(f"✅ Found {len(messages.data)} recent messages:")
                    for msg in messages.data:
                        print(f"   - [{msg.get('role')}] {msg.get('content')[:60]}...")
                else:
                    print(f"❌ No messages found for this agent")
            except Exception as e:
                print(f"❌ Error checking messages: {e}")
            
            # 3. Check interactions table
            print(f"\n3️⃣ Checking interactions for agent {agent_id}...")
            try:
                interactions = supabase.table("interactions").select("*").eq("agent_id", agent_id).order("created_at", desc=True).limit(5).execute()
                if interactions.data:
                    print(f"✅ Found {len(interactions.data)} recent interactions:")
                    for inter in interactions.data:
                        print(f"   - Source: {inter.get('source_channel')} | Status: {inter.get('status')}")
                        print(f"     User: {inter.get('user_message')[:60] if inter.get('user_message') else 'None'}...")
                        print(f"     Agent: {inter.get('agent_response')[:60] if inter.get('agent_response') else 'None'}...")
                else:
                    print(f"❌ No interactions found for this agent")
            except Exception as e:
                print(f"❌ Error checking interactions: {e}")
                
            # 4. Check if webhook is configured
            print(f"\n4️⃣ Checking webhook configuration...")
            configs = agent.get('webhook_configs', {})
            if configs:
                print("✅ webhook_configs found:")
                if configs.get('telegram'):
                    print(f"   Telegram: {configs['telegram']}")
                else:
                    print(f"   ❌ Telegram not in webhook_configs")
            else:
                print(f"❌ webhook_configs is empty")
                print(f"   Checking if token is in legacy field: {bool(agent.get('telegram_bot_token'))}")
            
        else:
            print(f"❌ Agent 'aaa' not found in database")
            print("\n   Available agents:")
            all_agents = supabase.table("agents").select("id, name, agent_type").execute()
            for a in all_agents.data:
                print(f"   - {a.get('name')} ({a.get('agent_type')})")
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
