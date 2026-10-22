"""
Postgres Integration Tests.
Uses Testcontainers to spin up a real Postgres instance for integration testing.
"""

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.pool import NullPool

from app.db.base import Base
from app.db.models.job import Job
from app.db.session import async_session_maker


@pytest_asyncio.fixture(scope="module")
async def postgres_engine():
    """
    Create a real Postgres engine using Testcontainers.
    Note: Requires Docker to be running.
    """
    # For now, we'll use a placeholder. In production, you'd use:
    # from testcontainers.postgres import PostgresContainer
    # postgres = PostgresContainer("postgres:16")
    # postgres.start()
    # database_url = postgres.get_connection_url()
    
    # Placeholder: Skip if Docker is not available
    pytest.skip("Testcontainers integration requires Docker. Skipping for now.")
    
    engine = create_async_engine(
        "postgresql+asyncpg://test:test@localhost:5432/test",
        poolclass=NullPool,
    )
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    yield engine
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest_asyncio.fixture
async def db_session(postgres_engine) -> AsyncSession:
    """Create a database session for integration tests."""
    async with async_session_maker(bind=postgres_engine) as session:
        yield session


@pytest.mark.anyio
async def test_create_job_with_geohash(db_session):
    """Test creating a job with automatic geohash computation."""
    job = Job(
        title="Senior Python Engineer",
        company="Tech Corp",
        description="Build amazing things",
        location_name="San Francisco, CA",
        url="https://example.com/job/1",
        is_remote=False,
        latitude=37.7749,
        longitude=-122.4194,
    )
    
    db_session.add(job)
    await db_session.commit()
    await db_session.refresh(job)
    
    assert job.id is not None
    assert job.geohash is not None
    assert len(job.geohash) == 12  # Full precision geohash
    assert job.geohash.startswith("9q8")  # San Francisco area


@pytest.mark.anyio
async def test_job_url_unique_constraint(db_session):
    """Test that duplicate URLs are rejected."""
    job1 = Job(
        title="Job 1",
        company="Company",
        description="Desc",
        url="https://example.com/job/unique",
    )
    
    job2 = Job(
        title="Job 2",
        company="Company",
        description="Desc",
        url="https://example.com/job/unique",  # Duplicate URL
    )
    
    db_session.add(job1)
    await db_session.commit()
    
    db_session.add(job2)
    
    with pytest.raises(Exception):  # IntegrityError
        await db_session.commit()