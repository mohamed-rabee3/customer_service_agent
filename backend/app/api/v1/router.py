from fastapi import APIRouter
from app.api.v1.endpoints import archives, interactions, analytics, admin, realtime_events

api_router = APIRouter()

# تجميع كل المسارات هنا
api_router.include_router(admin.router, prefix="/admin", tags=["Admin"])
api_router.include_router(archives.router, prefix="/archives", tags=["Archives"])
api_router.include_router(interactions.router, prefix="/interactions", tags=["Interactions"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["Analytics"])
api_router.include_router(realtime_events.router, prefix="/realtime", tags=["Realtime"])