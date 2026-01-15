"""Main router aggregating all API v1 routes."""

from fastapi import APIRouter

from app.api.v1.endpoints import agents, auth, supervisors

api_router = APIRouter()

# Include all endpoint routers
api_router.include_router(auth.router)
api_router.include_router(agents.router)
api_router.include_router(supervisors.router)

