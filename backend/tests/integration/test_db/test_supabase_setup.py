"""
Test Supabase Authentication and RLS Setup
Run this to verify your Supabase configuration is working correctly.
"""
import os
import sys
from uuid import uuid4

# Add backend directory to path (go up 3 levels from test file to reach backend/)
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
sys.path.insert(0, backend_dir)

# Change working directory to backend/ so .env file can be found
os.chdir(backend_dir)

try:
    import pytest
    from app.core.config import settings
    from supabase import create_client, Client
    from postgrest.exceptions import APIError
except ImportError as e:
    print(f"[ERROR] Error importing modules: {e}")
    print("Make sure you're in the project root and dependencies are installed.")
    print("Also make sure your virtual environment is activated.")
    sys.exit(1)


@pytest.fixture
def svc_client() -> Client | None:
    """Create a Supabase client using the service_role key (bypasses RLS)."""
    if not settings.supabase_url or not settings.supabase_service_key:
        return None
    try:
        return create_client(settings.supabase_url, settings.supabase_service_key)
    except Exception:
        return None


def print_section(title: str):
    """Print a formatted section header."""
    print("\n" + "=" * 70)
    print(f"  {title}")
    print("=" * 70)


def print_check(name: str, status: bool, details: str = ""):
    """Print a formatted check result."""
    icon = "[OK]" if status else "[FAIL]"
    print(f"{icon} {name}")
    if details:
        print(f"   {details}")


def test_1_check_environment_variables():
    """Test 1: Check if environment variables are loaded."""
    print_section("TEST 1: Environment Variables Check")
    
    checks = {
        "SUPABASE_URL": settings.supabase_url,
        "SUPABASE_KEY (anon/publishable)": settings.supabase_key,
        "SUPABASE_SERVICE_KEY (secret)": settings.supabase_service_key,
    }
    
    all_ok = True
    for name, value in checks.items():
        if value:
            masked = value[:20] + "..." if len(value) > 20 else value
            print_check(f"{name} is set", True, f"Value: {masked}")
        else:
            print_check(f"{name} is set", False, "MISSING - Check your .env file")
            all_ok = False
    
    return all_ok


def test_2_service_key_connection():
    """Test 2: Verify service_role key can connect."""
    print_section("TEST 2: Service Role Key Connection")
    
    try:
        svc_client = create_client(settings.supabase_url, settings.supabase_service_key)
        
        # Try a simple query that requires service_role (bypasses RLS)
        result = svc_client.table("supervisors").select("userID").limit(1).execute()
        
        print_check("Service key connection", True, "Successfully connected to Supabase")
        print_check("Service key can query supervisors table", True, 
                   f"Found {len(result.data)} supervisor(s)")
        
        if not result.data:
            print("   [WARNING] No supervisors found. Run db/004_seed_sample_data.sql first.")
            return False, None
        
        return True, svc_client
        
    except Exception as e:
        print_check("Service key connection", False, f"Error: {str(e)}")
        return False, None


def test_3_service_key_crud_operations(svc_client):
    """Test 3: Verify service_role key can perform CRUD operations."""
    print_section("TEST 3: Service Role Key CRUD Operations")
    
    if not svc_client:
        print("[SKIP] Skipping - Service client not available")
        return False
    
    try:
        # Get a supervisor ID for FK
        sup_result = svc_client.table("supervisors").select("userID").limit(1).execute()
        if not sup_result.data:
            print_check("CRUD operations", False, "No supervisors found for FK")
            return False
        
        supervisor_id = sup_result.data[0]["userID"]
        test_agent_id = str(uuid4())
        
        # CREATE
        try:
            insert_result = svc_client.table("agents").insert({
                "id": test_agent_id,
                "supervisor_id": supervisor_id,
                "name": "TEST_AGENT_CRUD",
                "agent_type": "voice",
                "system_prompt": "Test agent for CRUD operations",
                "status": "idle",
                "mcp_tools": {},
            }).execute()
            
            if insert_result.data:
                print_check("CREATE operation", True, f"Created agent with ID: {test_agent_id[:8]}...")
            else:
                print_check("CREATE operation", False, "Insert returned no data")
                return False
                
        except Exception as e:
            print_check("CREATE operation", False, f"Error: {str(e)}")
            return False
        
        # READ
        try:
            read_result = svc_client.table("agents").select("*").eq("id", test_agent_id).execute()
            if read_result.data and read_result.data[0]["id"] == test_agent_id:
                print_check("READ operation", True, f"Successfully read agent: {read_result.data[0]['name']}")
            else:
                print_check("READ operation", False, "Could not read created agent")
                return False
        except Exception as e:
            print_check("READ operation", False, f"Error: {str(e)}")
            return False
        
        # UPDATE
        try:
            update_result = svc_client.table("agents").update({
                "name": "TEST_AGENT_UPDATED"
            }).eq("id", test_agent_id).execute()
            
            if update_result.data and update_result.data[0]["name"] == "TEST_AGENT_UPDATED":
                print_check("UPDATE operation", True, "Successfully updated agent name")
            else:
                print_check("UPDATE operation", False, "Update did not work correctly")
                return False
        except Exception as e:
            print_check("UPDATE operation", False, f"Error: {str(e)}")
            return False
        
        # DELETE
        try:
            delete_result = svc_client.table("agents").delete().eq("id", test_agent_id).execute()
            # Verify deletion
            verify_result = svc_client.table("agents").select("id").eq("id", test_agent_id).execute()
            if not verify_result.data:
                print_check("DELETE operation", True, "Successfully deleted test agent")
            else:
                print_check("DELETE operation", False, "Agent still exists after delete")
                return False
        except Exception as e:
            print_check("DELETE operation", False, f"Error: {str(e)}")
            return False
        
        return True
        
    except Exception as e:
        print_check("CRUD operations", False, f"Unexpected error: {str(e)}")
        return False


def test_4_anon_key_blocked():
    """Test 4: Verify anon key is blocked by RLS."""
    print_section("TEST 4: Anon Key RLS Block Check")
    
    if not settings.supabase_key:
        print("[SKIP] Skipping - SUPABASE_KEY not set")
        return None
    
    try:
        anon_client = create_client(settings.supabase_url, settings.supabase_key)
        
        # Try to query agents table (should be blocked by RLS)
        try:
            result = anon_client.table("agents").select("*").limit(1).execute()
            print_check("Anon key blocked by RLS", False, 
                       "[SECURITY ISSUE] Anon key can access agents table!")
            print("   This means RLS policies are not working correctly.")
            return False
        except APIError as e:
            # This is expected - RLS should block anon access
            error_msg = str(e)
            if hasattr(e, 'message'):
                error_msg = str(e.message)
            if "permission denied" in error_msg.lower() or "RLS" in error_msg or "row-level security" in error_msg.lower():
                print_check("Anon key blocked by RLS", True, 
                           f"Correctly blocked with error: {error_msg}")
                return True
            else:
                print_check("Anon key blocked by RLS", False, 
                           f"Unexpected error type: {error_msg}")
                return False
        except Exception as e:
            print_check("Anon key blocked by RLS", False, 
                       f"Unexpected error: {str(e)}")
            return False
            
    except Exception as e:
        print_check("Anon key connection", False, f"Error: {str(e)}")
        return False


def test_5_foreign_key_constraints(svc_client):
    """Test 5: Verify foreign key constraints work."""
    print_section("TEST 5: Foreign Key Constraints")
    
    if not svc_client:
        print("[SKIP] Skipping - Service client not available")
        return False
    
    try:
        # Try to insert agent with invalid supervisor_id (should fail)
        invalid_id = str(uuid4())
        try:
            svc_client.table("agents").insert({
                "id": str(uuid4()),
                "supervisor_id": invalid_id,  # This UUID doesn't exist
                "name": "TEST_INVALID_FK",
                "agent_type": "voice",
                "system_prompt": "Test",
                "status": "idle",
                "mcp_tools": {},
            }).execute()
            
            print_check("Foreign key constraint", False, 
                       "[SECURITY ISSUE] Allowed insert with invalid supervisor_id!")
            return False
            
        except Exception as e:
            if "foreign key" in str(e).lower() or "violates" in str(e).lower():
                print_check("Foreign key constraint", True, 
                           "Correctly rejected invalid supervisor_id")
                return True
            else:
                print_check("Foreign key constraint", False, 
                           f"Unexpected error: {str(e)}")
                return False
                
    except Exception as e:
        print_check("Foreign key constraint", False, f"Error: {str(e)}")
        return False


def main():
    """Run all tests."""
    print("\n" + "=" * 70)
    print("  SUPABASE AUTHENTICATION & RLS SETUP TEST")
    print("=" * 70)
    
    results = {}
    
    # Test 1: Environment variables
    results["env_vars"] = test_1_check_environment_variables()
    if not results["env_vars"]:
        print("\n[ERROR] Environment variables missing. Cannot continue.")
        print("   Create backend/.env file with SUPABASE_URL, SUPABASE_KEY, SUPABASE_SERVICE_KEY")
        return
    
    # Test 2: Service key connection
    results["service_connection"], svc_client = test_2_service_key_connection()
    
    # Test 3: CRUD operations
    if results["service_connection"]:
        results["crud"] = test_3_service_key_crud_operations(svc_client)
    else:
        results["crud"] = False
    
    # Test 4: Anon key blocked
    results["anon_blocked"] = test_4_anon_key_blocked()
    
    # Test 5: Foreign key constraints
    if svc_client:
        results["fk_constraints"] = test_5_foreign_key_constraints(svc_client)
    else:
        results["fk_constraints"] = False
    
    # Summary
    print_section("TEST SUMMARY")
    
    total = len([r for r in results.values() if r is not None])
    passed = len([r for r in results.values() if r is True])
    
    print(f"\nTests Passed: {passed}/{total}")
    print("\nDetailed Results:")
    for test_name, result in results.items():
        if result is None:
            status = "[SKIPPED]"
        elif result:
            status = "[PASSED]"
        else:
            status = "[FAILED]"
        print(f"  {status} - {test_name.replace('_', ' ').title()}")
    
    if passed == total:
        print("\n[SUCCESS] All tests passed! Your Supabase setup is correct.")
    else:
        print("\n[WARNING] Some tests failed. Review the errors above.")
    
    print("\n" + "=" * 70 + "\n")


if __name__ == "__main__":
    main()

