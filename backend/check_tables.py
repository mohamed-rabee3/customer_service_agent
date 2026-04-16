#!/usr/bin/env python3
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app.core.config import settings
from supabase import create_client

supabase = create_client(settings.supabase_url, settings.supabase_key)

print("=" * 70)
print("DATABASE TABLES CHECK")
print("=" * 70)

# Check if tables exist and have data
tables_to_check = ['agents', 'chat_messages', 'interactions', 'users']

for table_name in tables_to_check:
    try:
        result = supabase.table(table_name).select('count', count='exact').execute()
        count = result.count if hasattr(result, 'count') else len(result.data)
        print(f"✅ {table_name}: exists, count={count}")
    except Exception as e:
        print(f"❌ {table_name}: {str(e)}")

print("\n" + "=" * 70)
print("CHECKING RAW DATA")
print("=" * 70)

# Try to get agents directly
try:
    response = supabase.table('agents').select('*').execute()
    print(f"✅ agents query succeeded")
    print(f"   Response type: {type(response)}")
    print(f"   Data: {response.data if hasattr(response, 'data') else 'No data attr'}")
except Exception as e:
    print(f"❌ agents query failed: {e}")

print("\n" + "=" * 70)
