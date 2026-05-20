import sys
import os

# Append the parent directory to sys.path so 'app' can be found
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.db.supabase import get_supabase_service_client

def main():
    client = get_supabase_service_client()
    
    try:
        users_resp = client.auth.admin.list_users()
        users = users_resp if isinstance(users_resp, list) else getattr(users_resp, "users", [])
        print(f"Found {len(users)} users in Auth.")
        
        for user in users:
            print(f"Processing user: {user.id} ({user.email})")
            try:
                res = client.table("supervisors").insert({
                    "userID": user.id,
                    "supervisor_type": "voice"
                }).execute()
                print(f"Added {user.email} to supervisors.")
            except Exception as e:
                pass
                
    except Exception as e:
        print(f"Error fetching users: {e}")

if __name__ == "__main__":
    main()
