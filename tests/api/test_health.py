"""
Health Check Endpoint Tests.
Validates the liveness and readiness probes.
 it
"""

import pytest
from fastapi import status
from httpx import AsyncClient


@pytest.mark.anyio
async def test_liveness_probe(async_client: AsyncClient):
    """Test that the liveness probe returns 200 OK."""
    response = await async_client.get("/api/v1/health/live")
    
    assert response.status_code == status.HTTP_200_OK
    assert response.json()["status"] == "healthy"


@pytest.mark.anyio
async def test_readiness_probe(async_client: AsyncClient):
    """
    Test that the readiness probe returns 200 OK.
    Note: This currently uses the in-memory SQLite test DB.
    """
    response = await async_client.get("/api/v1/health/ready")
    
    # Since we override the DB session with SQLite, it should connect successfully
    assert response.status_code == status.HTTP_200_OK
    assert response.json()["status"] == "ready"