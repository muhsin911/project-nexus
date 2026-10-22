"""
Redis-Backed Bloom Filter.
Implements a space-efficient probabilistic data structure for O(1) membership checks.
Uses standard Redis SETBIT/GETBIT commands to avoid requiring the RedisBloom module,
ensuring compatibility with free-tier Redis Cloud instances.
"""

import hashlib
import math

import redis.asyncio as aioredis


class RedisBloomFilter:
    """
    Async Redis-backed Bloom Filter.
    
    Math:
    - m (bit array size) = -(n * ln(p)) / (ln(2)^2)
    - k (hash functions) = (m / n) * ln(2)
    Where n = capacity, p = error_rate.
    """

    def __init__(self, redis_client: aioredis.Redis, key: str, capacity: int, error_rate: float = 0.01) -> None:
        self.redis = redis_client
        self.key = key
        self.capacity = capacity
        self.error_rate = error_rate
        
        # Calculate optimal bit array size (m) and number of hash functions (k)
        self.m = math.ceil(-(capacity * math.log(error_rate)) / (math.log(2) ** 2))
        self.k = math.ceil((self.m / capacity) * math.log(2))

    def _hash_values(self, item: str) -> list[int]:
        """
        Generates k hash positions using Kirsch-Mitzenmacher optimization.
        Uses MD5 and SHA256 to derive two independent hash values, then simulates k hashes.
        """
        md5_hash = int(hashlib.md5(item.encode("utf-8")).hexdigest(), 16)
        sha256_hash = int(hashlib.sha256(item.encode("utf-8")).hexdigest(), 16)
        
        h1 = md5_hash % self.m
        h2 = sha256_hash % self.m
        
        return [(h1 + i * h2) % self.m for i in range(self.k)]

    async def add(self, item: str) -> None:
        """Adds an item to the Bloom Filter by setting k bits."""
        positions = self._hash_values(item)
        pipe = self.redis.pipeline()
        for pos in positions:
            pipe.setbit(self.key, pos, 1)
        await pipe.execute()

    async def check(self, item: str) -> bool:
        """Checks if an item might exist in the Bloom Filter (O(1) time complexity)."""
        positions = self._hash_values(item)
        pipe = self.redis.pipeline()
        for pos in positions:
            pipe.getbit(self.key, pos)
        
        results = await pipe.execute()
        # getbit returns 0 or 1. If any bit is 0, the item is definitely not in the set.
        return all(results)