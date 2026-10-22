"""
Project NEXUS FastAPI Application Factory.
Configures the main application instance, middleware, routers, and async lifespan events.
"""

from app.websocket.redis_pubsub import ws_pubsub
from app.websocket.endpoints import router as ws_router

from app.events.dispatcher import dispatcher
from app.events.subscribers import on_job_scraped
from app.events.schemas import JobScrapedEvent

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.core.config import settings
from app.db.session import engine
from app.middleware.tracing import RequestIDMiddleware  # <-- Imported


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
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

    # Register Event Bus Subscribers
    await dispatcher.subscribe(JobScrapedEvent, on_job_scraped)
    print("✅ Event bus subscribers registered.")

    # Connect WebSocket Pub/Sub
    await ws_pubsub.connect()
    print("✅ WebSocket Pub/Sub connected.")
    
    yield  # Application is running and serving requests
    
    # --- SHUTDOWN ---
    print("🛑 Shutting down Project NEXUS API gracefully...")
    
    # Disconnect WebSocket Pub/Sub
    await ws_pubsub.disconnect()
    print("✅ WebSocket Pub/Sub disconnected.")
    
    # Dispose of the database engine
    await engine.dispose()
    print("✅ Database connections closed.")
    
    # Future Phase 3/5: await redis_client.close()
    # Future Phase 2: await scheduler.shutdown()


def create_app() -> FastAPI:
    """
    Application factory function.
    Allows for clean testing and multiple app instances if needed.
    """
    app = FastAPI(
        title=settings.PROJECT_NAME,
        description="Dual-purpose 3D Portfolio & Autonomous AI Job Agent System",
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
        "http://localhost:3000",
    ]
    
    # Future: if settings.ENVIRONMENT == "production":
    #     allowed_origins.append("https://nexus-portfolio.vercel.app")

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

    # WebSocket Router (no prefix, direct path)
    app.include_router(ws_router)

    return app


# Instantiate the application for ASGI servers (uvicorn)
app = create_app()