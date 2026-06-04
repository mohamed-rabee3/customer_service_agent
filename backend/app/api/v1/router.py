"""Main router aggregating all API v1 routes."""

from fastapi import APIRouter

from app.api.v1.endpoints import (
    admin, agents, analytics, archives, auth,
    chat, chat_sse, interactions, supervisors, tools,
    webhooks, webhooks_additional, settings
)

api_router = APIRouter()

# Include all endpoint routers
api_router.include_router(auth.router)
api_router.include_router(agents.router)
api_router.include_router(interactions.router)
api_router.include_router(supervisors.router)
api_router.include_router(tools.router)
api_router.include_router(settings.router)
api_router.include_router(archives.router, prefix="/archives", tags=["Archives"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["Analytics"])
api_router.include_router(admin.router, prefix="/admin", tags=["Admin"])
api_router.include_router(chat.router)
api_router.include_router(chat_sse.router)
api_router.include_router(webhooks.router)
api_router.include_router(webhooks_additional.router)
