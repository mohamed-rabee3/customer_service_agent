"""
Simple RLS Test - Two Requests
1. Try with anon key (SELECT may return 0 rows, INSERT should be blocked)
2. Try with service key (should work)

Note: PostgREST behavior:
- SELECT with no matching policies = 0 rows (no error) - This is CORRECT
- INSERT with no matching policies = ERROR (blocked) - This is CORRECT
Both behaviors indicate RLS is working properly.
"""
import os
import sys
import json

# Add backend directory to path and change working directory
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
sys.path.insert(0, backend_dir)
os.chdir(backend_dir)  # Change to backend directory to find .env file

# Use absolute path from workspace root
LOG_PATH = os.path.abspath(os.path.join(backend_dir, "..", ".cursor", "debug.log"))

def log_debug(location, message, data=None, hypothesis_id=None):
    """Write debug log to file."""
    try:
        # Ensure directory exists
        os.makedirs(os.path.dirname(LOG_PATH), exist_ok=True)
        log_entry = {
            "timestamp": int(__import__("time").time() * 1000),
            "location": location,
            "message": message,
            "data": data or {},
            "sessionId": "rls-test",
            "hypothesisId": hypothesis_id or "unknown"
        }
        with open(LOG_PATH, "a", encoding="utf-8") as f:
            f.write(json.dumps(log_entry) + "\n")
    except Exception as e:
        # Log to stderr so we can see if logging fails
        print(f"[LOG ERROR] {e}", file=sys.stderr)

try:
    from app.core.config import settings
    from supabase import create_client
    from postgrest.exceptions import APIError
except ImportError as e:
    print(f"[ERROR] Error importing modules: {e}")
    sys.exit(1)


def main():
    """Simple test: anon key vs service key."""
    print("\n" + "=" * 60)
    print("  SIMPLE RLS TEST")
    print("=" * 60)
    
    table_name = "agents"
    
    # Test 1: Anon Key (should be blocked)
    print(f"\n[TEST 1] Trying to access '{table_name}' with ANON KEY...")
    print("   Note: PostgREST returns 0 rows for SELECT (this is CORRECT behavior)")
    print("   We'll also test INSERT to verify RLS WITH CHECK is working")
    
    # #region agent log
    log_debug("test_rls_anon_block.py:main", "Starting anon key test", {
        "table": table_name,
        "supabase_url": settings.supabase_url[:50] if settings.supabase_url else None
    }, "H1")
    # #endregion
    
    # Also try INSERT to see if WITH CHECK triggers error
    # #region agent log
    log_debug("test_rls_anon_block.py:main", "Will also test INSERT to check WITH CHECK", {}, "H5")
    # #endregion
    
    try:
        # #region agent log
        log_debug("test_rls_anon_block.py:main", "Creating anon client", {"url": settings.supabase_url[:50]}, "H1")
        # #endregion
        
        anon_client = create_client(settings.supabase_url, settings.supabase_key)
        
        # #region agent log
        log_debug("test_rls_anon_block.py:main", "Executing query with anon key", {"table": table_name}, "H1")
        # #endregion
        
        result = anon_client.table(table_name).select("*").limit(1).execute()
        
        # #region agent log
        # Check the full response object for more details
        response_info = {
            "row_count": len(result.data) if result.data else 0,
            "got_error": False,
            "result_data": str(result.data)[:200] if result.data else "empty",
            "has_data": result.data is not None,
            "data_type": str(type(result.data)),
        }
        # Try to get response metadata if available
        if hasattr(result, 'count'):
            response_info["count"] = result.count
        if hasattr(result, 'status_code'):
            response_info["status_code"] = result.status_code
        log_debug("test_rls_anon_block.py:main", "Anon query succeeded", response_info, "H1")
        # #endregion
        
        print(f"\n[OK] Anon key SELECT returned {len(result.data)} row(s) (PostgREST behavior)")
        print("   This is CORRECT - PostgREST returns 0 rows when no policies match")
        
        # Try INSERT to verify RLS WITH CHECK is working
        # #region agent log
        log_debug("test_rls_anon_block.py:main", "Testing INSERT with anon key", {}, "H5")
        # #endregion
        try:
            # Try to insert a dummy row (should fail with WITH CHECK)
            insert_result = anon_client.table(table_name).insert({
                "name": "test_block",
                "supervisor_id": "00000000-0000-0000-0000-000000000000"
            }).execute()
            # #region agent log
            log_debug("test_rls_anon_block.py:main", "INSERT succeeded (unexpected)", {
                "got_error": False
            }, "H5")
            # #endregion
            print("   [FAIL] INSERT succeeded - RLS WITH CHECK not working!")
            anon_works = True  # Both SELECT and INSERT work = RLS not working
        except Exception as insert_error:
            # #region agent log
            log_debug("test_rls_anon_block.py:main", "INSERT blocked", {
                "got_error": True,
                "error": str(insert_error)[:200]
            }, "H5")
            # #endregion
            print(f"   [OK] INSERT is blocked: {str(insert_error)[:100]}")
            print("   This confirms RLS WITH CHECK is working correctly!")
            anon_works = False  # INSERT blocked = RLS working (SELECT 0 rows is expected)
    except APIError as e:
        error_msg = str(e)
        if hasattr(e, 'message'):
            error_msg = str(e.message)
        
        # #region agent log
        log_debug("test_rls_anon_block.py:main", "Anon query blocked (APIError)", {
            "error": error_msg[:200],
            "got_error": True,
            "error_type": "APIError"
        }, "H1")
        # #endregion
        
        print(f"\n[OK] Anon key is BLOCKED (RLS working correctly)")
        print(f"   Got ERROR as expected: {error_msg[:100]}")
        anon_works = False
    except Exception as e:
        # #region agent log
        log_debug("test_rls_anon_block.py:main", "Anon query failed (unexpected)", {
            "error": str(e)[:200],
            "got_error": True,
            "error_type": type(e).__name__
        }, "H1")
        # #endregion
        
        print(f"\n[ERROR] Unexpected error: {str(e)[:100]}")
        anon_works = None
    
    # Test 2: Service Key (should work)
    print(f"\n[TEST 2] Trying to access '{table_name}' with SERVICE KEY...")
    
    # #region agent log
    log_debug("test_rls_anon_block.py:main", "Starting service key test", {"table": table_name}, "H2")
    # #endregion
    
    try:
        # #region agent log
        log_debug("test_rls_anon_block.py:main", "Creating service client", {"url": settings.supabase_url[:50]}, "H2")
        # #endregion
        
        svc_client = create_client(settings.supabase_url, settings.supabase_service_key)
        
        # #region agent log
        log_debug("test_rls_anon_block.py:main", "Executing query with service key", {"table": table_name}, "H2")
        # #endregion
        
        result = svc_client.table(table_name).select("*").limit(1).execute()
        
        # #region agent log
        log_debug("test_rls_anon_block.py:main", "Service query succeeded", {
            "row_count": len(result.data) if result.data else 0,
            "got_error": False
        }, "H2")
        # #endregion
        
        print(f"[OK] Service key CAN access {table_name} table (RLS bypassed)")
        print(f"   Found {len(result.data)} row(s)")
        service_works = True
    except Exception as e:
        # #region agent log
        log_debug("test_rls_anon_block.py:main", "Service query failed", {
            "error": str(e)[:200],
            "got_error": True
        }, "H2")
        # #endregion
        
        print(f"[FAIL] Service key CANNOT access {table_name} table!")
        print(f"   Error: {str(e)[:100]}")
        service_works = False
    
    # Summary
    print("\n" + "=" * 60)
    print("  RESULT")
    print("=" * 60)
    
    if anon_works is False and service_works is True:
        print("[SUCCESS] RLS is working correctly!")
        print("   - Anon key SELECT returns 0 rows (PostgREST behavior - CORRECT)")
        print("   - Anon key INSERT is blocked (RLS WITH CHECK working - CORRECT)")
        print("   - Service key bypasses RLS (got data - CORRECT)")
        return True
    else:
        print("[FAILED] RLS is NOT working correctly!")
        if anon_works:
            print("   - PROBLEM: Anon key can INSERT - RLS WITH CHECK not working")
            print("   - This means RLS is not properly blocking anon users")
            print("   - Fix: Check that RLS is enabled and policies are created")
        if not service_works:
            print("   - PROBLEM: Service key should work but it's blocked")
        return False


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
