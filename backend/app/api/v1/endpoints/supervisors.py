"""Supervisor endpoints."""
from typing import Dict, Any
from fastapi import APIRouter, Depends, Query
from app.api.v1.schemas.supervisor import SupervisorListResponse
from app.api.deps import get_current_user, require_admin
from app.services.supervisor_service import SupervisorService

router = APIRouter()

@router.get("/", response_model=SupervisorListResponse)
async def get_supervisors(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user = Depends(require_admin) # Admin only as per security docs
):
    """
    List all supervisors (Admin only).
    """
    service = SupervisorService()
    result = await service.get_supervisors(page, limit)
    
    return {
        "data": result["data"],
        "total": result["total"],
        "page": page,
        "limit": limit
    }
