import os
import sys
import logging
import requests
from dotenv import load_dotenv
from supabase import create_client, Client

# Setup logging
logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

# Load env
load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

API_BASE = "http://localhost:8001/v1"

ADMIN_EMAIL = "ym3570938@gmail.com"
PASSWORD = "&X*FT51N&ro%5S9xGJ9b"

TEST_SUPER_EMAIL = "test_super_api_integration@test.com"

if not SUPABASE_URL or not SUPABASE_KEY:
    logger.error("Missing Supabase credentials in .env")
    sys.exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def test_api():
    logger.info("--- Starting API Integration Testing ---")
    
    # 1. Auth Login (Acquire Real JWTs)
    logger.info("Logging in as Admin...")
    admin_auth = supabase.auth.sign_in_with_password({"email": ADMIN_EMAIL, "password": PASSWORD})
    admin_token = admin_auth.session.access_token
    admin_id = admin_auth.user.id
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    
    try:
        # === TEST 1: Supervisor CRUD (Admin Only) ===
        logger.info("\n--- TEST 1: Supervisor Endpoints (Admin) ---")
        
        # Clean up if previous tests left it
        res = requests.get(f"{API_BASE}/supervisors?page=1&limit=100", headers=admin_headers)
        for sup in res.json().get("supervisors", []):
            if sup["name"] == TEST_SUPER_EMAIL:
                requests.delete(f"{API_BASE}/supervisors/{sup['id']}", headers=admin_headers)

        # Create
        logger.info("Admin creating a dedicated test supervisor...")
        res = requests.post(f"{API_BASE}/supervisors", headers=admin_headers, json={
            "email": TEST_SUPER_EMAIL,
            "password": PASSWORD,
            "supervisor_type": "chat"
        })
        if res.status_code != 201:
            raise AssertionError(f"Admin failed to create supervisor: {res.text}")
        test_super_id = res.json()["id"]

        logger.info("Logging in as the new isolated Supervisor...")
        super_auth = supabase.auth.sign_in_with_password({"email": TEST_SUPER_EMAIL, "password": PASSWORD})
        super_token = super_auth.session.access_token
        super_headers = {"Authorization": f"Bearer {super_token}"}

        # Attempt to create supervisor as non-admin (SHOULD FAIL)
        res = requests.post(f"{API_BASE}/supervisors", headers=super_headers, json={"email": "hacker@test.com", "password": "password123", "supervisor_type": "chat"})
        if res.status_code != 403:
            raise AssertionError(f"Supervisor was able to access Admin endpoint! Status: {res.status_code}")
        logger.info("Security verified: Supervisor blocked from creating another supervisor (403).")

        # === TEST 2: Agent CRUD (Supervisor) ===
        logger.info("\n--- TEST 2: Agent Endpoints (Isolated Supervisor) ---")
        
        logger.info("Creating a new Voice Agent for Supervisor...")
        res = requests.post(f"{API_BASE}/agents", headers=super_headers, json={
            "name": "Integration Test Agent",
            "system_prompt": "You are a test agent."
        })
        if res.status_code != 201:
            raise AssertionError(f"Failed to create agent: {res.text}")
        agent_data = res.json()
        agent_id = agent_data["id"]
        logger.info(f"Agent created successfully in DB: {agent_id}")

        logger.info("Reading Agent details...")
        res = requests.get(f"{API_BASE}/agents/{agent_id}", headers=super_headers)
        if res.status_code != 200:
            raise AssertionError(f"Failed to get agent: {res.text}")
        if res.json()["name"] != "Integration Test Agent":
            raise AssertionError("DB Data Mismatch!")
        logger.info("Agent read matches DB exactly.")

        logger.info("Updating Agent...")
        res = requests.put(f"{API_BASE}/agents/{agent_id}", headers=super_headers, json={
            "name": "Updated Test Agent",
            "system_prompt": "Updated prompt."
        })
        if res.status_code != 200:
            raise AssertionError(f"Failed to update agent: {res.text}")
        if res.json()["name"] != "Updated Test Agent":
            raise AssertionError("Agent name did not update in DB!")
        logger.info("Agent correctly updated in DB.")

        logger.info("Deleting Agent...")
        res = requests.delete(f"{API_BASE}/agents/{agent_id}", headers=super_headers)
        if res.status_code != 204:
            raise AssertionError(f"Failed to delete agent: {res.text}")
        
        res = requests.get(f"{API_BASE}/agents/{agent_id}", headers=super_headers)
        if res.status_code != 404:
            raise AssertionError("Agent still exists in DB after delete!")
        logger.info("Agent successfully deleted from DB.")

        # === TEST 3: Interactions and Analytics ===
        logger.info("\n--- TEST 3: Data Fetching / Isolation ---")
        
        res = requests.get(f"{API_BASE}/interactions/?page=1&limit=10", headers=admin_headers)
        if res.status_code != 200:
            raise AssertionError(f"Admin interactions failed: {res.text}")
        logger.info(f"Admin retrieved {res.json()['total']} total interactions.")

        res = requests.get(f"{API_BASE}/supervisors/me/dashboard", headers=super_headers)
        if res.status_code != 200:
            raise AssertionError(f"Supervisor dashboard failed: {res.text}")
        logger.info("Supervisor dashboard retrieved successfully.")

        res = requests.get(f"{API_BASE}/analytics/supervisor/{test_super_id}", headers=admin_headers)
        if res.status_code != 200:
            raise AssertionError(f"Admin analytics failed: {res.text}")
        logger.info("Admin successfully accessed supervisor analytics.")

        # Cleanup
        logger.info("\n--- CLEANUP ---")
        logger.info("Deleting isolated supervisor entirely...")
        res = requests.delete(f"{API_BASE}/supervisors/{test_super_id}", headers=admin_headers)
        if res.status_code != 200:
            raise AssertionError(f"Cleanup failed: {res.text}")
        
        logger.info("\n✅ ALL INTEGRATION TESTS PASSED SUCCESSFULLY.")
        logger.info("Database mutations (CRUD) reflect perfectly. Role-Based Access Controls enforce isolation.")

    except AssertionError as e:
        logger.error(f"❌ TEST FAILED: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    test_api()
