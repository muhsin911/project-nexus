"""
API v1 Router Aggregation.
Centralizes all version 1 endpoints for clean inclusion in the main FastAPI app.
"""

from fastapi import APIRouter

from app.api.v1.endpoints import health, portfolio

api_router = APIRouter()

# Include all v1 endpoint routers here
api_router.include_router(health.router, prefix="/health")
api_router.include_router(portfolio.router, prefix="/portfolio")
