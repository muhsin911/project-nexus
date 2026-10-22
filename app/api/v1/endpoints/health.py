"""
Health Check Endpoints.
Provides liveness and readiness probes for container orchestration (Render, Railway, etc.).
"""

from fastapi import APIRouter, status
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.core.deps import DBSessionDep, SettingsDep

router = APIRouter(tags=["Health"])


@router.get(
    "/live",
    status_code=status.HTTP_200_OK,
    summary="Liveness Probe",
    description="Indicates if the application process is running.",
)
async def liveness_probe() -> dict[str, str]:
    """
    Liveness probe: returns 200 OK if the FastAPI process is alive.
    Orchestrators use this to decide whether to restart a hung container.
    """
    return {"status": "healthy", "service": "project-nexus-api"}


@router.get(
    "/ready",
    status_code=status.HTTP_200_OK,
    summary="Readiness Probe",
    description="Indicates if the application is ready to serve traffic (DB connected).",
)
async def readiness_probe(settings: SettingsDep, db: DBSessionDep) -> dict[str, str]:
    """
    Readiness probe: verifies connections to critical infrastructure.
    Uses a lightweight query to avoid overloading free-tier databases during boot.
    """
    try:
        # Lightweight query to verify DB connection without heavy I/O
        await db.execute(text("SELECT 1"))
        
        return {
            "status": "ready",
            "database": "connected",
        }
    except SQLAlchemyError as e:
        # In Phase 5, this will be replaced with structured logging (structlog)
        return {
            "status": "degraded",
            "database": "disconnected",
            "error": str(e),
        }