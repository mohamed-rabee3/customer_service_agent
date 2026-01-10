from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.db.supabase_client import supabase

security = HTTPBearer()


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        # التحقق من التوكن عبر سوبابيز
        user_res = supabase.auth.get_user(token)
        if not user_res.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token"
            )

        # جلب بيانات المستخدم الإضافية (مثل الـ role) من جدول البروفايل الخاص بكِ
        # نفترض أن الجدول اسمه profiles أو supervisors
        user_id = user_res.user.id
        profile = supabase.table("supervisors").select("*").eq("id", user_id).single().execute()

        if not profile.data:
            # محاولة البحث في جدول الـ admins إذا لم يكن سوبرفايزر
            profile = supabase.table("admins").select("*").eq("id", user_id).single().execute()

        if not profile.data:
            raise HTTPException(status_code=403, detail="User profile not found")

        return profile.data  # سيعيد dict يحتوي على id, role, full_name... إلخ
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Could not validate credentials: {str(e)}"
        )