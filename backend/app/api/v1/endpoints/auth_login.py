from fastapi import APIRouter, HTTPException
from app.db.supabase_client import supabase
from app.api.v1.schemas.auth import LoginRequest, LoginResponse

router = APIRouter()


@router.post("/login", response_model=LoginResponse)
async def login(data: LoginRequest):
    try:
        # محاولة تسجيل الدخول عبر سوبابيز
        res = supabase.auth.sign_in_with_password({
            "email": data.email,
            "password": data.password
        })

        if not res.user:
            raise HTTPException(status_code=401, detail="Invalid credentials")

        # جلب بيانات المشرف عشان نعرف الـ role
        user_id = res.user.id
        profile = supabase.table("supervisors").select("role").eq("id", user_id).single().execute()

        role = profile.data.get("role", "supervisor") if profile.data else "supervisor"

        return {
            "access_token": res.session.access_token,
            "user_id": user_id,
            "role": role
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))