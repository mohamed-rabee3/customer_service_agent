#!/usr/bin/env python3
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app.core.config import settings
from supabase import create_client

supabase = create_client(settings.supabase_url, settings.supabase_key)

tables = ['supervisors', 'agents', 'interactions', 'chat_messages', 'agent_tools', 'agent_analytics', 'realtime_metrics', 'tool_permissions']

print('=' * 70)
print('DATABASE MIGRATION VERIFICATION')
print('=' * 70)

all_good = True
for table in tables:
    try:
        result = supabase.table(table).select('*', count='exact').limit(1).execute()
        status = '✅'
        print(f'{status} {table.ljust(20)} - EXISTS')
    except Exception as e:
        status = '❌'
        all_good = False
        print(f'{status} {table.ljust(20)} - {str(e)[:50]}')

print('=' * 70)
if all_good:
    print("✅ ALL TABLES CREATED SUCCESSFULLY!")
else:
    print("❌ Some tables are missing")
print('=' * 70)
