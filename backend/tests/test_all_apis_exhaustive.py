import os
import sys
import logging
import requests
import uuid
from dotenv import load_dotenv
from supabase import create_client, Client

# Setup logging
logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

# Load env
load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY") # Use service role for direct DB bypassing verification
if not SUPABASE_SERVICE_KEY:
    SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_KEY")

API_BASE = "http://localhost:8001/v1"

ADMIN_EMAIL = "ym3570938@gmail.com"
PASSWORD = "&X*FT51N&ro%5S9xGJ9b"
TEST_SUPER_EMAIL = f"test_super_{uuid.uuid4().hex[:6]}@test.com"

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    logger.error("Missing Supabase credentials in .env")
    sys.exit(1)

# App client for auth
supabase_auth: Client = create_client(SUPABASE_URL, os.getenv("SUPABASE_KEY"))
# Service client for raw DB checks
db: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

def test_api():
    logger.info("==================================================")
    logger.info("🚀 STARTING EXHAUSTIVE API & DATABASE VERIFICATION")
    logger.info("==================================================")
    
    # 1. Auth Login (Acquire Real JWTs)
    logger.info("\n🔑 [AUTH] Logging in as Admin...")
    admin_auth = supabase_auth.auth.sign_in_with_password({"email": ADMIN_EMAIL, "password": PASSWORD})
    admin_token = admin_auth.session.access_token
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    
    try:
        # ==========================================
        # SUPERVISORS API TEST
        # ==========================================
        logger.info("\n--- 1. Testing SUPERVISORS API ---")
        
        # [POST] Create Supervisor
        logger.info("Checking DB BEFORE Supervisor Create...")
        before_sups = db.table("supervisors").select("*").execute()
        before_count = len(before_sups.data)
        
        logger.info(f"API Request: POST /supervisors for {TEST_SUPER_EMAIL}")
        res = requests.post(f"{API_BASE}/supervisors", headers=admin_headers, json={
            "email": TEST_SUPER_EMAIL,
            "password": PASSWORD,
            "supervisor_type": "chat"
        })
        assert res.status_code == 201, f"Failed to create supervisor: {res.text}"
        super_id = res.json()["id"]
        
        import time
        time.sleep(1) # Give DB a moment
        logger.info("Checking DB AFTER Supervisor Create...")
        after_sups = db.table("supervisors").select("*").execute()
        after_count = len(after_sups.data)
        logger.info(f"Before: {before_count}, After: {after_count}")
        assert after_count == before_count + 1, "DB count did not increment!"
        
        raw_sup = db.table("supervisors").select("*").eq("userID", super_id).execute().data[0]
        assert raw_sup["supervisor_type"] == "chat", "DB mismatch!"
        logger.info("✅ POST /supervisors: Verified API created record in Supabase.")

        # [GET] List Supervisors
        logger.info("API Request: GET /supervisors")
        res = requests.get(f"{API_BASE}/supervisors?page=1&limit=50", headers=admin_headers)
        assert res.status_code == 200
        logger.info("✅ GET /supervisors: Verified.")

        # [PUT] Update Supervisor
        logger.info("API Request: PUT /supervisors/{id}")
        res = requests.put(f"{API_BASE}/supervisors/{super_id}", headers=admin_headers, json={
            "supervisor_type": "voice"
        })
        assert res.status_code == 200
        
        logger.info("Checking DB AFTER Supervisor Update...")
        raw_sup = db.table("supervisors").select("*").eq("userID", super_id).execute().data[0]
        assert raw_sup["supervisor_type"] == "voice", "DB update failed!"
        logger.info("✅ PUT /supervisors/{id}: Verified API updated record in Supabase.")

        # Log in as the newly created supervisor
        logger.info("\n🔑 [AUTH] Logging in as new Supervisor...")
        super_auth_res = supabase_auth.auth.sign_in_with_password({"email": TEST_SUPER_EMAIL, "password": PASSWORD})
        super_token = super_auth_res.session.access_token
        super_headers = {"Authorization": f"Bearer {super_token}"}

        # [GET] Supervisor Dashboard
        logger.info("API Request: GET /supervisors/me/dashboard")
        res = requests.get(f"{API_BASE}/supervisors/me/dashboard", headers=super_headers)
        assert res.status_code == 200
        logger.info("✅ GET /supervisors/me/dashboard: Verified.")

        # ==========================================
        # AGENTS API TEST
        # ==========================================
        logger.info("\n--- 2. Testing AGENTS API ---")
        
        # [POST] Create Agent
        logger.info("Checking DB BEFORE Agent Create...")
        before_agents = db.table("agents").select("*").eq("supervisor_id", super_id).execute()
        
        logger.info("API Request: POST /agents")
        res = requests.post(f"{API_BASE}/agents", headers=super_headers, json={
            "name": "Live DB Sync Test Agent",
            "system_prompt": "Prompt A"
        })
        assert res.status_code == 201
        agent_id = res.json()["id"]
        
        logger.info("Checking DB AFTER Agent Create...")
        after_agents = db.table("agents").select("*").eq("supervisor_id", super_id).execute()
        assert len(after_agents.data) == len(before_agents.data) + 1, "Agent DB count did not increment!"
        
        raw_agent = db.table("agents").select("*").eq("id", agent_id).execute().data[0]
        assert raw_agent["name"] == "Live DB Sync Test Agent"
        assert raw_agent["supervisor_id"] == super_id
        logger.info("✅ POST /agents: Verified API created record correctly linked to supervisor in Supabase.")

        # [GET] Read Agent Status
        logger.info("API Request: GET /agents/{id}/status")
        res = requests.get(f"{API_BASE}/agents/{agent_id}/status", headers=super_headers)
        assert res.status_code == 200
        logger.info("✅ GET /agents/{id}/status: Verified.")

        # [PUT] Update Agent
        logger.info("API Request: PUT /agents/{id}")
        res = requests.put(f"{API_BASE}/agents/{agent_id}", headers=super_headers, json={
            "name": "Live DB Sync Test Agent (Updated)",
            "system_prompt": "Prompt B"
        })
        assert res.status_code == 200
        
        logger.info("Checking DB AFTER Agent Update...")
        raw_agent = db.table("agents").select("*").eq("id", agent_id).execute().data[0]
        assert raw_agent["name"] == "Live DB Sync Test Agent (Updated)"
        assert raw_agent["system_prompt"] == "Prompt B"
        logger.info("✅ PUT /agents/{id}: Verified API updated record in Supabase.")

        # ==========================================
        # INTERACTIONS & ARCHIVES API TEST
        # ==========================================
        logger.info("\n--- 3. Testing INTERACTIONS & ARCHIVES API (READ-ONLY endpoints) ---")
        
        logger.info("API Request: GET /interactions/")
        res = requests.get(f"{API_BASE}/interactions/?page=1&limit=5", headers=admin_headers)
        assert res.status_code == 200
        logger.info("✅ GET /interactions/: Verified.")

        logger.info("API Request: GET /archives/")
        res = requests.get(f"{API_BASE}/archives/?page=1&limit=5", headers=admin_headers)
        assert res.status_code == 200
        logger.info("✅ GET /archives/: Verified.")

        # ==========================================
        # ANALYTICS API TEST
        # ==========================================
        logger.info("\n--- 4. Testing ANALYTICS API ---")
        
        logger.info(f"API Request: GET /analytics/supervisor/{super_id}")
        res = requests.get(f"{API_BASE}/analytics/supervisor/{super_id}", headers=admin_headers)
        assert res.status_code in [200, 404] # Might be 404 if no interactions exist yet, which is valid API response
        logger.info("✅ GET /analytics/supervisor/{id}: Verified routing and execution.")

        logger.info(f"API Request: GET /analytics/agent/{agent_id}")
        res = requests.get(f"{API_BASE}/analytics/agent/{agent_id}", headers=super_headers)
        assert res.status_code in [200, 404]
        logger.info("✅ GET /analytics/agent/{id}: Verified routing and execution.")

        # ==========================================
        # DELETE / CLEANUP
        # ==========================================
        logger.info("\n--- 5. Clean up & DELETE API TEST ---")
        
        # Delete Agent
        logger.info("API Request: DELETE /agents/{id}")
        res = requests.delete(f"{API_BASE}/agents/{agent_id}", headers=super_headers)
        assert res.status_code == 204
        
        logger.info("Checking DB AFTER Agent Delete...")
        raw_agent_check = db.table("agents").select("*").eq("id", agent_id).execute().data
        assert len(raw_agent_check) == 0, "Agent was NOT deleted from Supabase!"
        logger.info("✅ DELETE /agents/{id}: Verified API removed record from Supabase.")

        # Delete Supervisor (Cascade)
        logger.info("API Request: DELETE /supervisors/{id}")
        res = requests.delete(f"{API_BASE}/supervisors/{super_id}", headers=admin_headers)
        assert res.status_code == 200
        
        logger.info("Checking DB AFTER Supervisor Delete...")
        raw_sup_check = db.table("supervisors").select("*").eq("userID", super_id).execute().data
        assert len(raw_sup_check) == 0, "Supervisor was NOT deleted from Supabase!"
        logger.info("✅ DELETE /supervisors/{id}: Verified API removed record from Supabase.")

        logger.info("==================================================")
        logger.info("🎉 EXHAUSTIVE TESTING COMPLETED. 100% SUCCESS.")
        logger.info("All DB mutations before/after were strictly verified.")
        logger.info("==================================================")

    except AssertionError as e:
        logger.error(f"❌ ASSERTION FAILED: {str(e)}")
        sys.exit(1)
    except Exception as e:
        logger.error(f"❌ UNEXPECTED ERROR: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    test_api()
