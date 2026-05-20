import asyncio
import os
import secrets
import string
from uuid import uuid4

from supabase import create_client
from dotenv import load_dotenv

# Load environment variables
load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    print("Error: SUPABASE_URL or SUPABASE_SERVICE_KEY not found in .env file.")
    exit(1)

# Initialize Supabase client with the SERVICE ROLE KEY to bypass RLS
# This is required to insert into auth.users directly via the admin API
supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

def generate_password(length=14):
    """Simple password for testing."""
    return "Pass1234!"

async def create_users():
    print("Initializing user creation with Service Role Key (RLS Bypassed)...")

    users_to_create = [
        {
            "email": "admintest4@gmail.com",
            "role": "admin",
            "name": "Admin User 4",
            "table": "admin"
        },
        {
            "email": "supervisortest4@gmail.com",
            "role": "supervisor",
            "name": "Supervisor User 4",
            "table": "supervisors",
            "type": "voice"
        }
    ]

    for user_info in users_to_create:
        email = user_info["email"]
        password = generate_password()
        name = user_info["name"]
        table = user_info["table"]

        print(f"\nProcessing {user_info['role'].upper()}: {email}")
        
        try:
            # 1. Create/Check Auth User
            user_id = None
            try:
                auth_res = supabase.auth.admin.create_user({
                    "email": email,
                    "password": password,
                    "email_confirm": True,
                    "user_metadata": {"name": name}
                })
                user_id = auth_res.user.id
                print(f"-> Auth user created with ID: {user_id}")
                print(f"-> TEMP PASSWORD: {password}")
            except Exception as e:
                if "already been registered" in str(e):
                    # Fetch existing user ID
                    users_res = supabase.auth.admin.list_users()
                    user_id = next((u.id for u in users_res if u.email == email), None)
                    print(f"-> User already exists in Auth. ID: {user_id}")
                    
                    # Reset password so we know what it is
                    supabase.auth.admin.update_user_by_id(
                        user_id, 
                        {"password": password}
                    )
                    print(f"-> Password reset performed.")
                    print(f"-> TEMP PASSWORD: {password}")
                else:
                    raise e

            if not user_id:
                print(f"!! Failed to resolve user ID for {email}")
                continue

            # 2. Link to Role Table
            insert_data = {"userID": user_id}
            if table == "supervisors":
                insert_data["supervisor_type"] = user_info.get("type", "voice")
                insert_data["performance_score"] = 100
                insert_data["total_interactions"] = 0
                # Note: 'name' is omitted here as it's stored in Auth metadata per previous error checks
            
            try:
                supabase.table(table).insert(insert_data).execute()
                print(f"-> Successfully linked to public.{table} table.")
            except Exception as e:
                if "already exists" in str(e).lower() or "duplicate key" in str(e).lower():
                    print(f"-> Already linked to public.{table}.")
                else:
                    print(f"!! Failed to link to {table}: {e}")

        except Exception as e:
            print(f"!! Critical error processing {email}: {e}")

    print("\nUser creation script completed.")

if __name__ == "__main__":
    asyncio.run(create_users())
