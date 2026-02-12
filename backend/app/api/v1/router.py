from fastapi import APIRouter

from app.api.v1.endpoints import (
    auth,
    supervisors,
    tools,
    analytics,   # 👈 ضيفي ده
    archives,    # 👈 وضيفي ده
)

api_router = APIRouter()

api_router.include_router(auth.router)
api_router.include_router(supervisors.router)
api_router.include_router(tools.router)
api_router.include_router(analytics.router)
api_router.include_router(archives.router)
