"""Admin endpoints."""
from fastapi import APIRouter, Depends
from app.api.v1.schemas.admin import AdminDashboardResponse
from app.api.deps import require_admin
from app.services.admin_service import AdminService

router = APIRouter()

@router.get("/dashboard", response_model=AdminDashboardResponse)
async def get_admin_dashboard(
    current_user = Depends(require_admin)
):
    """Get admin dashboard data."""
    service = AdminService()
    return await service.get_dashboard_data()
