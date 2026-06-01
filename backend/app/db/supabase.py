"""Supabase client initialization — thread-safe for asyncio.to_thread workers."""

import logging
import threading
import time
from collections.abc import Callable
from contextvars import ContextVar
from typing import TypeVar

import httpx
from httpx import Timeout
from supabase import Client, create_client
from supabase.lib.client_options import SyncClientOptions

from app.core.config import settings

logger = logging.getLogger(__name__)

# Per-thread clients: sharing one httpx HTTP/2 connection across thread-pool workers
# causes RemoteProtocolError (ConnectionTerminated).
_thread_anon = threading.local()
_thread_service = threading.local()

# Context variable to securely hold the current request's JWT token
request_jwt: ContextVar[str | None] = ContextVar("request_jwt", default=None)

_HTTP_TIMEOUT = Timeout(30.0)
_RETRYABLE_ERRORS = (httpx.RemoteProtocolError, httpx.ConnectError, httpx.ReadTimeout)

T = TypeVar("T")


def _build_sync_client(api_key: str) -> Client:
    httpx_client = httpx.Client(http2=False, timeout=_HTTP_TIMEOUT)
    options = SyncClientOptions(
        httpx_client=httpx_client,
        postgrest_client_timeout=30.0,
    )
    return create_client(
        settings.supabase_url,
        api_key,
        options=options,
    )


def _clear_thread_service_client() -> None:
    if hasattr(_thread_service, "client"):
        del _thread_service.client


def run_supabase_request(fn: Callable[[], T], *, retries: int = 3) -> T:
    """Run a Supabase call with retries after transient HTTP connection failures."""
    last_error: Exception | None = None
    for attempt in range(retries):
        try:
            return fn()
        except _RETRYABLE_ERRORS as e:
            last_error = e
            _clear_thread_service_client()
            if attempt < retries - 1:
                delay = 0.15 * (attempt + 1)
                logger.warning(
                    "Supabase connection error (attempt %s/%s), retrying in %.2fs: %s",
                    attempt + 1,
                    retries,
                    delay,
                    e,
                )
                time.sleep(delay)
    assert last_error is not None
    raise last_error


def get_supabase_client() -> Client:
    """
    Get Supabase client instance.
    If a JWT context is active, returns a fresh client scoped to the request.
    Otherwise uses a per-thread anon client (safe with asyncio.to_thread).
    """
    token = request_jwt.get()

    if token:
        client = _build_sync_client(settings.supabase_key)
        client.postgrest.auth(token)
        return client

    client = getattr(_thread_anon, "client", None)
    if client is None:
        client = _build_sync_client(settings.supabase_key)
        _thread_anon.client = client
    return client


def get_supabase_service_client() -> Client:
    """Service-role client, one per thread (for repositories + background workers)."""
    client = getattr(_thread_service, "client", None)
    if client is None:
        client = _build_sync_client(settings.supabase_service_key)
        _thread_service.client = client
    return client
