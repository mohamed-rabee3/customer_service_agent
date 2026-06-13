"""FastAPI application entry point."""

import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.agents.chat_session_manager import run_chat_idle_sweeper
from app.api.v1.router import api_router
from app.core.config import settings
from app.core.exceptions import BaseAppException


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Start background tasks (chat idle sweeper) on startup."""
    stop_event = asyncio.Event()
    sweeper_task = asyncio.create_task(run_chat_idle_sweeper(stop_event))
    yield
    stop_event.set()
    sweeper_task.cancel()
    try:
        await sweeper_task
    except asyncio.CancelledError:
        pass


# Create FastAPI application
app = FastAPI(
    title="Customer Service AI Agents Platform API",
    description="REST API for managing AI-powered customer service agents",
    version="1.0.0",
    lifespan=lifespan,
)

# Configure CORS
_cors_origins = settings.cors_origins_list
app.add_middleware(
    CORSMiddleware,
    allow_origins=[] if _cors_origins == ["*"] else _cors_origins,
    allow_origin_regex=r"https?://.*" if _cors_origins == ["*"] else None,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API router
app.include_router(api_router, prefix="/v1")


@app.get("/")
async def root():
    """Landing page for the API server (avoids confusing 404 on /)."""
    return {
        "message": "Customer Service AI Agents Platform API",
        "docs": "/docs",
        "health": "/health",
        "api_prefix": "/v1",
        "frontend_dev": "http://localhost:8080",
    }


# Exception handler for custom exceptions
@app.exception_handler(BaseAppException)
async def app_exception_handler(request: Request, exc: BaseAppException):
    """Handle custom application exceptions."""
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.message},
    )


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}



