#!/usr/bin/env python3
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app.core.config import settings
from supabase import create_client
import json

supabase = create_client(settings.supabase_url, settings.supabase_key)

print("=" * 70)
print("AGENTS IN DATABASE")
print("=" * 70)

agents = supabase.table('agents').select('id, name, agent_type, webhook_configs, telegram_bot_token, status').execute()

if agents.data:
    for a in agents.data:
        print(f"\n👤 Agent: {a['name']}")
        print(f"   ID: {a['id']}")
        print(f"   Type: {a['agent_type']}")
        print(f"   Status: {a['status']}")
        print(f"   telegram_bot_token (legacy): {bool(a.get('telegram_bot_token'))}")
        
        configs = a.get('webhook_configs')
        if configs:
            print(f"   webhook_configs:")
            print(f"     {json.dumps(configs, indent=6)}")
        else:
            print(f"   webhook_configs: None")
else:
    print("No agents found")

print("\n" + "=" * 70)
