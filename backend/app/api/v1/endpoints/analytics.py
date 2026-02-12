"""Analytics endpoints."""

from fastapi import APIRouter, Depends
from app.api.v1.schemas.analytics import AdminAnalyticsOut
from app.services.analytics_service import AnalyticsService
from app.core.security import require_admin


router = APIRouter(prefix="/admin", tags=["Analytics"])


@router.get(
    "/analytics",
    response_model=list[AdminAnalyticsOut],
    dependencies=[Depends(require_admin)]
)
def get_admin_analytics(agent_type: str | None = None):
    return AnalyticsService().get_admin_analytics(agent_type)
