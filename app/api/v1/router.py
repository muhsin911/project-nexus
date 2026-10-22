"""
API v1 Router Aggregation.
Centralizes all version 1 endpoints for clean inclusion in the main FastAPI app.
"""

from fastapi import APIRouter

from app.api.v1.endpoints import health

api_router = APIRouter()

# Include all v1 endpoint routers here
api_router.include_router(health.router, prefix="/health")

# Future routers will be added here:
# api_router.include_router(jobs.router, prefix="/jobs", tags=["Jobs"])
# api_router.include_router(agent.router, prefix="/agent", tags=["AI Agent"])