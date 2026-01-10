from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.db.supabase_client import supabase

security = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        user_res = supabase.auth.get_user(token)
        if not user_res.user:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        # البحث عن بيانات المشرف
        user_id = user_res.user.id
        profile = supabase.table("supervisors").select("*").eq("id", user_id).single().execute()
        
        if not profile.data:
            raise HTTPException(status_code=403, detail="Supervisor profile not found")
            
        return profile.data
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Auth error: {str(e)}")