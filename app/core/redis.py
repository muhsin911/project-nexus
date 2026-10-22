"""
Async Redis Client Singleton.
Provides a shared, connection-pooled Redis client for the application.
"""

import redis.asyncio as aioredis
from functools import lru_cache

from app.core.config import settings


@lru_cache(maxsize=1)
def get_redis_client() -> aioredis.Redis:
    """
    Returns a singleton async Redis client.
    decode_responses=False is used to ensure binary safety for operations like SETBIT/GETBIT.
    """
    return aioredis.from_url(
        settings.REDIS_URL,
        decode_responses=False,
    )