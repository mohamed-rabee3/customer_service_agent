#!/usr/bin/env python3
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app.core.config import settings
from supabase import create_client
import json

supabase = create_client(settings.supabase_url, settings.supabase_key)

print("=" * 80)
print("TESTING AGENTS IN DATABASE")
print("=" * 80)

# Check agents
try:
    agents = supabase.table('agents').select('*').execute()
    
    if agents.data:
        print(f"\n✅ Found {len(agents.data)} agent(s):\n")
        for agent in agents.data:
            print(f"  📌 Agent ID: {agent['id']}")
            print(f"     Name: {agent['name']}")
            print(f"     Type: {agent['agent_type']}")
            print(f"     Status: {agent['status']}")
            print(f"     System Prompt: {agent['system_prompt'][:60]}...")
            print(f"     Supervisor ID: {agent['supervisor_id']}")
            
            # Check webhook configs
            webhook_configs = agent.get('webhook_configs')
            if webhook_configs:
                print(f"     Webhook Configs:")
                print(f"       Telegram: {webhook_configs.get('telegram', {})}")
                print(f"       WhatsApp: {webhook_configs.get('whatsapp', {})}")
                print(f"       Instagram: {webhook_configs.get('instagram', {})}")
            else:
                print(f"     Webhook Configs: None")
            
            # Check legacy telegram token
            tg_token = agent.get('telegram_bot_token')
            print(f"     Legacy Telegram Token: {'✅ Set' if tg_token else '❌ Not Set'}")
            
            print()
    else:
        print("\n❌ No agents found in database")
        print("\nTo create an agent:")
        print("  1. Go to http://localhost:8080")
        print("  2. Click 'Add New Agent'")
        print("  3. Fill in Name, Type (Chat), System Prompt")
        print("  4. Go to Telegram tab and add your bot token")
        print("  5. Save")
        
except Exception as e:
    print(f"❌ Error checking agents: {e}")
    import traceback
    traceback.print_exc()

print("\n" + "=" * 80)

# Check interactions
try:
    interactions = supabase.table('interactions').select('*').execute()
    if interactions.data:
        print(f"\n✅ Interactions: {len(interactions.data)} record(s)")
        for inter in interactions.data[:3]:
            print(f"  - Agent: {inter['agent_id']}")
            print(f"    Type: {inter['interaction_type']}")
            print(f"    Status: {inter['status']}")
    else:
        print("\n❌ No interactions yet")
except Exception as e:
    print(f"❌ Error checking interactions: {e}")

# Check chat messages
try:
    messages = supabase.table('chat_messages').select('*').execute()
    if messages.data:
        print(f"\n✅ Chat Messages: {len(messages.data)} message(s)")
    else:
        print("\n❌ No chat messages yet")
except Exception as e:
    print(f"❌ Error checking chat_messages: {e}")

print("\n" + "=" * 80)
