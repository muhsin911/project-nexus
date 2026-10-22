"""
Bloom Filter Tests.
Validates the O(1) deduplication logic of the Redis-backed Bloom Filter.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock

from app.utils.bloom_filter import RedisBloomFilter


@pytest.fixture
def mock_redis_client():
    """Create a mock Redis client with async pipeline support."""
    client = MagicMock()
    
    # Mock the pipeline method
    pipeline_mock = AsyncMock()
    pipeline_mock.setbit = AsyncMock(return_value=pipeline_mock)
    pipeline_mock.getbit = AsyncMock(return_value=pipeline_mock)
    pipeline_mock.execute = AsyncMock(return_value=[1, 1, 1]) # Simulate all bits set
    
    client.pipeline = MagicMock(return_value=pipeline_mock)
    return client


@pytest.mark.anyio
async def test_bloom_filter_add(mock_redis_client):
    """Test that adding an item calls the correct Redis pipeline commands."""
    bf = RedisBloomFilter(redis_client=mock_redis_client, key="test:bloom", capacity=100)
    
    await bf.add("https://example.com/job/123")
    
    # Verify pipeline was created and executed
    mock_redis_client.pipeline.assert_called_once()
    pipeline = mock_redis_client.pipeline.return_value
    pipeline.execute.assert_awaited_once()


@pytest.mark.anyio
async def test_bloom_filter_check(mock_redis_client):
    """Test that checking an item returns the expected boolean."""
    bf = RedisBloomFilter(redis_client=mock_redis_client, key="test:bloom", capacity=100)
    
    # Mock execute to return [1, 1, 1] (item likely exists)
    mock_redis_client.pipeline.return_value.execute.return_value = [1, 1, 1]
    
    result = await bf.check("https://example.com/job/123")
    
    assert result is True