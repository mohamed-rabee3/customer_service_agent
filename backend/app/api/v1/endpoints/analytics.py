from fastapi import APIRouter, Depends, Query
from app.services.analytics_service import AnalyticsService
from app.core.security import get_current_user
from app.api.v1.schemas.analytics import SupervisorAnalytics, AgentAnalytics

router = APIRouter()

@router.get("/supervisor/{supervisor_id}", response_model=SupervisorAnalytics)
async def get_supervisor_analytics(
    supervisor_id: str,
    period: str = Query("all_time", regex="^(today|week|month|all_time)$"),
    current_user = Depends(get_current_user)
):
    return await AnalyticsService.get_supervisor_stats(supervisor_id, period, current_user)

@router.get("/agent/{agent_id}", response_model=AgentAnalytics)
async def get_agent_analytics(
    agent_id: str,
    period: str = Query("all_time", regex="^(today|week|month|all_time)$"),
    current_user = Depends(get_current_user)
):
    return await AnalyticsService.get_agent_stats(agent_id, period, current_user)