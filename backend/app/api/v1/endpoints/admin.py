from fastapi import APIRouter, Depends, HTTPException
from app.services.admin_service import AdminService
from app.core.security import get_current_user
from app.api.v1.schemas.admin import AdminDashboardResponse

router = APIRouter()


@router.get("/dashboard", response_model=AdminDashboardResponse)
async def get_admin_dashboard(current_user=Depends(get_current_user)):
    # الصلاحية فقط للآدمن
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    return await AdminService.get_dashboard_stats()