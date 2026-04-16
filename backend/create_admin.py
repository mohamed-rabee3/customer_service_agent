from app.db.supabase import get_supabase_service_client
import sys

def create_admin(email, password):
    client = get_supabase_service_client()
    
    print(f"Creating Auth user for {email}...")
    try:
        # Create the user in Supabase Auth
        # Using confirm=True to skip email verification
        user_res = client.auth.admin.create_user({
            "email": email, 
            "password": password, 
            "email_confirm": True
        })
        
        user_id = user_res.user.id
        print(f"✅ Auth user created! ID: {user_id}")
        
        print(f"Creating admin profile in database...")
        # Check if record already exists in admin table
        existing = client.table("admin").select("*").eq("userID", user_id).execute()
        if existing.data:
            print("⚠️ Admin profile already exists.")
        else:
            # Insert the record into admin table
            profile_res = client.table("admin").insert({
                "userID": user_id
            }).execute()
            print("✅ Admin profile created!")
            
        print("\n" + "="*30)
        print("ADMIN ACCOUNT CREATED SUCCESSFULLY")
        print(f"Email: {email}")
        print(f"Password: {password}")
        print("="*30)
        
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    import random
    import string
    
    # Generate random email if not provided
    random_id = ''.join(random.choices(string.ascii_lowercase + string.digits, k=5))
    email = f"admin_{random_id}@agent.ai"
    password = "Admin" + ''.join(random.choices(string.digits, k=6)) + "!"
    
    create_admin(email, password)
