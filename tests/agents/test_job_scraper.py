"""
Job Scraper Agent Tests.
Validates the complete scraping workflow with mocked dependencies.
"""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock

from app.ai.agents.job_scraper import JobScraperAgent
from app.events.schemas import JobScrapedEvent


@pytest.fixture
def agent():
    """Create a JobScraperAgent instance."""
    return JobScraperAgent()


@pytest.fixture
def mock_bloom_filter():
    """Mock the Bloom Filter."""
    with patch('app.ai.agents.job_scraper.bloom_filter') as mock:
        mock.check = AsyncMock(return_value=False)
        mock.add = AsyncMock()
        yield mock


@pytest.fixture
def mock_fetch_tool():
    """Mock the fetch_job_page tool."""
    with patch('app.ai.agents.job_scraper.fetch_job_page') as mock:
        mock.ainvoke = AsyncMock(return_value="<html><title>Test Job</title></html>")
        yield mock


@pytest.fixture
def mock_extract_tool():
    """Mock the extract_job_details tool."""
    with patch('app.ai.agents.job_scraper.extract_job_details') as mock:
        mock.invoke = MagicMock(return_value={
            "title": "Test Job Title",
            "company": "Test Company",
            "description": "Test description",
            "location_name": "Remote",
            "is_remote": True,
            "latitude": None,
            "longitude": None,
        })
        yield mock


@pytest.fixture
def mock_create_job():
    """Mock the database job creation."""
    with patch('app.ai.agents.job_scraper.create_job') as mock:
        mock_job = MagicMock()
        mock_job.id = "test-job-id-123"
        mock_job.title = "Test Job Title"
        mock_job.url = "https://example.com/job/123"
        mock.return_value = mock_job
        yield mock


@pytest.fixture
def mock_dispatcher():
    """Mock the event dispatcher."""
    with patch('app.ai.agents.job_scraper.dispatcher') as mock:
        mock.publish = AsyncMock()
        yield mock


@pytest.mark.anyio
async def test_agent_name(agent):
    """Test that the agent has the correct name."""
    assert agent.name == "job_scraper"


@pytest.mark.anyio
async def test_agent_requires_url(agent):
    """Test that the agent raises an error if no URL is provided."""
    with pytest.raises(ValueError, match="requires a 'url' kwarg"):
        await agent.run()


@pytest.mark.anyio
async def test_agent_skips_duplicate_url(agent, mock_bloom_filter):
    """Test that the agent skips URLs already in the Bloom Filter."""
    mock_bloom_filter.check.return_value = True
    
    result = await agent.run(url="https://example.com/job/123")
    
    assert result["status"] == "skipped"
    assert result["reason"] == "duplicate_url"
    mock_bloom_filter.check.assert_awaited_once_with("https://example.com/job/123")


@pytest.mark.anyio
async def test_agent_successful_scrape(
    agent,
    mock_bloom_filter,
    mock_fetch_tool,
    mock_extract_tool,
    mock_create_job,
    mock_dispatcher,
):
    """Test the complete successful scraping workflow."""
    url = "https://example.com/job/123"
    
    result = await agent.run(url=url)
    
    # Verify Bloom Filter was checked and URL was added
    mock_bloom_filter.check.assert_awaited_once_with(url)
    mock_bloom_filter.add.assert_awaited_once_with(url)
    
    # Verify tools were called
    mock_fetch_tool.ainvoke.assert_awaited_once_with({"url": url})
    mock_extract_tool.invoke.assert_called_once()
    
    # Verify job was created in database
    mock_create_job.assert_awaited_once()
    created_job_data = mock_create_job.call_args[0][0]
    assert created_job_data["url"] == url
    assert created_job_data["title"] == "Test Job Title"
    
    # Verify event was published
    mock_dispatcher.publish.assert_awaited_once()
    published_event = mock_dispatcher.publish.call_args[0][0]
    assert isinstance(published_event, JobScrapedEvent)
    assert published_event.job_id == "test-job-id-123"
    assert published_event.url == url
    
    # Verify result
    assert result["status"] == "success"
    assert result["job_id"] == "test-job-id-123"
    assert result["title"] == "Test Job Title"


@pytest.mark.anyio
async def test_agent_handles_tool_failure(
    agent,
    mock_bloom_filter,
    mock_fetch_tool,
):
    """Test that the agent handles tool execution failures gracefully."""
    mock_fetch_tool.ainvoke.side_effect = Exception("Network error")
    
    result = await agent.run(url="https://example.com/job/123")
    
    assert result["status"] == "failed"
    assert result["reason"] == "tool_error"
    assert "Network error" in result["error"]


@pytest.mark.anyio
async def test_agent_handles_database_failure(
    agent,
    mock_bloom_filter,
    mock_fetch_tool,
    mock_extract_tool,
    mock_create_job,
):
    """Test that the agent handles database save failures gracefully."""
    mock_create_job.side_effect = Exception("Database connection failed")
    
    result = await agent.run(url="https://example.com/job/123")
    
    assert result["status"] == "failed"
    assert result["reason"] == "db_error"
    assert "Database connection failed" in result["error"]