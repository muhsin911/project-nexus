"""
Request ID Tracing Middleware.
Generates or extracts a unique Request ID for every incoming HTTP request,
injecting it into the async context for structured logging and observability.
"""

import uuid
from contextvars import ContextVar
from typing import Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

# Context variable to hold the request ID for the current async task.
# ContextVars are natively aware of asyncio tasks, ensuring request IDs 
# don't leak between concurrent requests.
request_id_ctx_var: ContextVar[str] = ContextVar("request_id", default="unknown")


class RequestIDMiddleware(BaseHTTPMiddleware):
    """
    FastAPI Middleware to manage Request IDs.
    Extracts an existing ID from headers (e.g., from a load balancer) or generates a new one.
    """
    HEADER_NAME = "X-Request-ID"

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Extract existing request ID from headers or generate a new UUID
        req_id = request.headers.get(self.HEADER_NAME) or str(uuid.uuid4())
        
        # Set the context variable for this request's lifecycle
        token = request_id_ctx_var.set(req_id)
        
        try:
            response = await call_next(request)
            # Add the request ID to the response headers for client-side tracing
            response.headers[self.HEADER_NAME] = req_id
            return response
        finally:
            # Reset the context variable to avoid leaking to other requests
            request_id_ctx_var.reset(token)


def get_request_id() -> str:
    """Helper to retrieve the current request ID from the async context."""
    return request_id_ctx_var.get()