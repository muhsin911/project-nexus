"""
Pytest Configuration and Async Fixtures.
Provides isolated, reusable test dependencies for FastAPI, SQLAlchemy, and Redis.
"""

import asyncio
import pytest
from collections.abc import AsyncGenerator
from typing import Any

import redis.asyncio as aioredis
from fastapi.testclient import TestClient
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.pool import StaticPool

from app.core.config import settings
from app.db.base import Base
from app.db.session import get_db, async_session_maker
from app.main import app

# -----------------------------------------------------------------------------
# Database Fixtures
# -----------------------------------------------------------------------------
# Use an in-memory SQLite database for fast, isolated unit tests.
# Note: For complex PostGIS/asyncpg specific features, integration tests 
# should use a dedicated test Postgres container (configured in Task 5.2).
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

@pytest.fixture(scope="session")
def event_loop() -> asyncio.AbstractEventLoop:
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="session")
async def test_engine():
    """Create a test database engine."""
    engine = create_async_engine(
        TEST_DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    yield engine
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest.fixture
async def db_session(test_engine) -> AsyncGenerator[AsyncSession, None]:
    """
    Create a new database session for a test.
    Overrides the default `get_db` dependency.
    """
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async_session_factory = async_session_maker(bind=test_engine)
    
    async with async_session_factory() as session:
        yield session
        
    await session.rollback()


@pytest.fixture
async def override_get_db(db_session: AsyncSession):
    """Override the FastAPI dependency to use the test database session."""
    async def _get_test_db() -> AsyncGenerator[AsyncSession, None]:
        yield db_session
    
    app.dependency_overrides[get_db] = _get_test_db
    yield
    app.dependency_overrides.clear()


# -----------------------------------------------------------------------------
# HTTP Client Fixtures
# -----------------------------------------------------------------------------
@pytest.fixture
async def async_client(override_get_db) -> AsyncGenerator[AsyncClient, None]:
    """
    Provide an async HTTP client for testing FastAPI endpoints.
    """
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac


@pytest.fixture
def client(override_get_db) -> TestClient:
    """
    Provide a synchronous TestClient for basic endpoint checks.
    """
    with TestClient(app) as c:
        yield c


# -----------------------------------------------------------------------------
# Redis Fixture (Mock/Skeleton)
# -----------------------------------------------------------------------------
@pytest.fixture
async def mock_redis() -> AsyncGenerator[aioredis.Redis, None]:
    """
    Provide a mocked or isolated test Redis client.
    In Task 5.2, this will be upgraded to use a real Testcontainers Redis instance.
    """
    # For now, we yield a skeleton. Tests requiring Redis should mock 
    # `app.core.redis.get_redis_client` or use `fakeredis` for async.
    yield None 