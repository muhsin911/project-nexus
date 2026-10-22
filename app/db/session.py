"""
Async Database Session Management.
Configures the SQLAlchemy async engine and session factory with free-tier optimizations.
"""

from collections.abc import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings

# Free-tier optimized connection pooling
# pool_size=5, max_overflow=10 prevents overwhelming free-tier DB limits (e.g., Neon, Render)
# pool_pre_ping=True is CRITICAL for serverless DBs to detect and reconnect dropped idle connections
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DB_ECHO,
    pool_size=5,
    max_overflow=10,
    pool_pre_ping=True,
    pool_recycle=3600,  # Recycle connections after 1 hour to prevent stale connections
)

async_session_maker = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI dependency for acquiring an async database session.
    Ensures proper cleanup, rollback on failure, and return of connections to the pool.
    """
    async with async_session_maker() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()