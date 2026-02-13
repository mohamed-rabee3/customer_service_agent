"""Analytics endpoints."""
from typing import Dict, Any, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, Query, HTTPException, status
from app.api.v1.schemas.auth import UserResponse
from app.api.v1.schemas.analytics import SupervisorAnalytics, AgentAnalytics
from app.api.deps import get_current_user
from app.services.analytics_service import AnalyticsService
from app.core.constants import UserRole

router = APIRouter()

@router.get("/supervisor/{supervisor_id}", response_model=SupervisorAnalytics)
async def get_supervisor_analytics(
    supervisor_id: UUID,
    time_period: str = Query("all_time", regex="^(today|week|month|all_time)$"),
    current_user: UserResponse = Depends(get_current_user),
):
    """Get analytics for specific supervisor."""
    if current_user.role != UserRole.ADMIN and current_user.id != supervisor_id:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    service = AnalyticsService()
    return await service.get_supervisor_analytics(supervisor_id, time_period)

@router.get("/agent/{agent_id}", response_model=AgentAnalytics)
async def get_agent_analytics(
    agent_id: UUID,
    time_period: str = Query("all_time", regex="^(today|week|month|all_time)$"),
    current_user: UserResponse = Depends(get_current_user),
):
    """Get analytics for specific agent."""
    service = AnalyticsService()
    from app.db.supabase import get_supabase_client
    supabase = get_supabase_client()
    agent_res = supabase.table("agents").select("supervisor_id").eq("id", str(agent_id)).single().execute()
    
    if not agent_res.data:
        raise HTTPException(status_code=404, detail="Agent not found")
        
    if current_user.role != UserRole.ADMIN and str(current_user.id) != agent_res.data["supervisor_id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    return await service.get_agent_analytics(agent_id, time_period)
