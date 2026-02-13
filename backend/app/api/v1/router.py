"""Main router aggregating all API v1 routes."""

from fastapi import APIRouter

from app.api.v1.endpoints import auth, archives, admin, interactions, analytics, supervisors

api_router = APIRouter()

# Include all endpoint routers
api_router.include_router(auth.router, prefix="/auth", tags=["Auth"])
api_router.include_router(archives.router, prefix="/archives", tags=["Archives"])
api_router.include_router(admin.router, prefix="/admin", tags=["Admin"])
api_router.include_router(interactions.router, prefix="/interactions", tags=["Interactions"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["Analytics"])
api_router.include_router(supervisors.router, prefix="/supervisors", tags=["Supervisors"])

