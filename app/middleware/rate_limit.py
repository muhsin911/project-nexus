"""
Leaky Bucket Rate Limiter for Outbound LLM Requests.
Prevents 429 Too Many Requests errors on free-tier providers (Groq, Gemini)
by strictly controlling the rate of outbound API calls.
"""

import asyncio
import time
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager


class LeakyBucketRateLimiter:
    """
    Async Leaky Bucket rate limiter.
    
    The bucket has a fixed capacity (max_tokens). Tokens are added at a fixed rate 
    (refill_rate tokens per second). Each request consumes one token.
    If the bucket is empty, the request waits asynchronously until a token is available.
    """

    def __init__(self, capacity: int, refill_rate: float) -> None:
        """
        Args:
            capacity: Maximum number of tokens (requests) the bucket can hold.
            refill_rate: Number of tokens added per second.
        """
        self.capacity = capacity
        self.refill_rate = refill_rate
        self.tokens = float(capacity)
        self.last_refill = time.monotonic()
        self._lock = asyncio.Lock()

    async def _refill(self) -> None:
        """Refill tokens based on elapsed time."""
        now = time.monotonic()
        elapsed = now - self.last_refill
        self.tokens = min(self.capacity, self.tokens + (elapsed * self.refill_rate))
        self.last_refill = now

    @asynccontextmanager
    async def acquire(self) -> AsyncIterator[None]:
        """
        Acquire a token from the bucket. Waits asynchronously if the bucket is empty.
        
        Usage:
            async with llm_rate_limiter.acquire():
                response = await groq_client.chat.completions.create(...)
        """
        async with self._lock:
            await self._refill()
            
            # Wait until at least 1 token is available
            while self.tokens < 1.0:
                wait_time = (1.0 - self.tokens) / self.refill_rate
                await asyncio.sleep(wait_time)
                await self._refill()
                
            # Consume the token
            self.tokens -= 1.0
            
        try:
            yield
        finally:
            pass


# -----------------------------------------------------------------------------
# Singleton Instances
# -----------------------------------------------------------------------------

# LLM Outbound Rate Limiter
# Configured for Groq free tier: ~30 RPM -> 0.5 tokens/sec, capacity 10
# This allows a small burst of 10 requests, then throttles to 1 request every 2 seconds.
llm_rate_limiter = LeakyBucketRateLimiter(capacity=10, refill_rate=0.5)