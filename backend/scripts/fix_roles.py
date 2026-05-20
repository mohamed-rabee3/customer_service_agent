import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.db.supabase import get_supabase_service_client

def main():
    client = get_supabase_service_client()
    
    try:
        users_resp = client.auth.admin.list_users()
        users = users_resp if isinstance(users_resp, list) else getattr(users_resp, "users", [])
        
        for user in users:
            email = user.email.lower() if user.email else ""
            sup_type = "chat" if "chat" in email else "voice"
            
            try:
                # Use upsert to update existing ones and insert new ones
                client.table("supervisors").upsert({
                    "userID": user.id,
                    "supervisor_type": sup_type
                }).execute()
                print(f"Set {user.email} -> {sup_type}")
            except Exception as e:
                print(f"Error for {user.email}: {e}")
                
    except Exception as e:
        print(f"Error fetching users: {e}")

if __name__ == "__main__":
    main()
