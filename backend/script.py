import os
from dotenv import load_dotenv
from supabase import create_client

# Explicitly use absolute path for .env to succeed regardless of CWD context
base_dir = os.path.dirname(os.path.abspath(__file__))
env_path = os.path.join(base_dir, ".env")
load_dotenv(dotenv_path=env_path)

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_KEY") # Use Service Key for testing (or Anon if needed)

if not url or not key:
    # Fallback: maybe key is SUPABASE_KEY?
    key = os.environ.get("SUPABASE_KEY")

if not url:
    print("❌ Error: SUPABASE_URL not found in .env (Check file path)")
    exit(1)
if not key:
    print("❌ Error: SUPABASE_KEY/SERVICE_KEY not found in .env")
    exit(1)

supabase = create_client(url, key)

email = "youssef5364378@gmail.com"  # Change this
password = "&X*FT51N&ro%5S9xGJ9b"  # Change this

try:
    response = supabase.auth.sign_in_with_password({"email": email, "password": password})
    print("\n[SUCCESS] LOGIN SUCCESS!")
    print(f"User ID: {response.user.id}")
    print("\n[KEY] ACCESS TOKEN (Copy this for Postman/Testing):")
    print(response.session.access_token)
except Exception as e:
    print(f"[ERROR] Login Failed: {e}")