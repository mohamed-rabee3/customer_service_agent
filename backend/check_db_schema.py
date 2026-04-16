#!/usr/bin/env python
"""Check database schema and what tables exist."""

import sys
import os
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from app.db.supabase import get_supabase_service_client

print("=" * 80)
print("🗃️  CHECKING DATABASE SCHEMA")
print("=" * 80)

db = get_supabase_service_client()

# Try to get interactions
print("\n1️⃣  Checking 'interactions' table...")
try:
    inter_res = db.table("interactions").select("id").limit(1).execute()
    print("   ✅ Found interactions table")
except Exception as e:
    print(f"   ❌ Error: {e}")

# Try to get chat_messages
print("\n2️⃣  Checking 'chat_messages' table...")
try:
    msg_res = db.table("chat_messages").select("id").limit(1).execute()
    print("   ✅ Found chat_messages table")
except Exception as e:
    print(f"   ❌ Error: {e}")

# Try to get agents
print("\n3️⃣  Checking 'agents' table...")
try:
    agents_res = db.table("agents").select("id, name").limit(1).execute()
    print("   ✅ Found agents table")
except Exception as e:
    print(f"   ❌ Error: {e}")

# Try to query raw using RPC or raw SQL if available
print("\n4️⃣  Checking available tables...")
try:
    # Query information_schema to list tables
    tables_res = db.rpc("get_tables", {}).execute() if hasattr(db, 'rpc') else None
    if tables_res:
        print("   Available tables:", tables_res.data)
    else:
        print("   Could not list tables")
except Exception as e:
    print(f"   ⚠️  RPC not available: {e}")

print("\n" + "=" * 80)
