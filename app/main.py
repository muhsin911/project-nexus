"""
Project NEXUS FastAPI Application Factory.
Configures the main application instance, middleware, routers, and async lifespan events.
"""

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.core.config import settings
from app.db.session import engine
from app.middleware.tracing import RequestIDMiddleware


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None]:
    """
    Async lifespan context manager for graceful startup and shutdown.

    Startup:
    - Validates configuration (already done by Pydantic at import).
    - Intentionally lightweight: avoids eager connection storms that trigger
      free-tier boot timeouts (e.g., Render's 30-second limit). Connections
      are established lazily on first request.

    Shutdown:
    - Disposes of the SQLAlchemy async engine, returning all connections to
      the pool and closing them, preventing orphaned sockets.
    """
    # --- STARTUP ---
    print(f"🚀 Starting Project NEXUS API in {settings.ENVIRONMENT} mode...")

    yield  # Application is running and serving requests

    # --- SHUTDOWN ---
    print("🛑 Shutting down Project NEXUS API gracefully...")

    # Dispose of the database engine
    await engine.dispose()
    print("✅ Database connections closed.")


def create_app() -> FastAPI:
    """
    Application factory function.
    Allows for clean testing and multiple app instances if needed.
    """
    app = FastAPI(
        title=settings.PROJECT_NAME,
        description="Personal portfolio and owner-managed career content.",
        version="0.1.0",
        docs_url="/docs" if settings.DEBUG else None,  # Hide docs in production
        redoc_url="/redoc" if settings.DEBUG else None,
        openapi_url="/openapi.json" if settings.DEBUG else None,
        lifespan=lifespan,
    )

    # CORS Configuration
    # Restrict to known frontend domains in production to prevent CSRF
    allowed_origins = [
        "http://localhost:5173",  # Vite default dev server
        "http://localhost:5174",  # Docker Compose frontend port
        "http://localhost:3000",
    ]
    if settings.FRONTEND_ORIGIN:
        allowed_origins.append(settings.FRONTEND_ORIGIN.rstrip("/"))

    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["*"],
    )

    # Request ID Tracing Middleware
    # Added AFTER CORS so it can correctly modify response headers
    app.add_middleware(RequestIDMiddleware)

    # Include Routers
    app.include_router(api_router, prefix=settings.API_V1_PREFIX)

    return app


# Instantiate the application for ASGI servers (uvicorn)
app = create_app()
