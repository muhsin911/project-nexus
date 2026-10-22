"""
Job Scraper Agent.
Autonomous agent responsible for scraping, deduplicating, and processing job postings.
"""

import logging
from typing import Any

from app.ai.agents.base import BaseAgent
from app.ai.tools.scraper_tools import extract_job_details, fetch_job_page
from app.core.redis import get_redis_client
from app.db.services.job_service import create_job
from app.events.dispatcher import dispatcher
from app.events.schemas import JobScrapedEvent
from app.utils.bloom_filter import RedisBloomFilter

logger = logging.getLogger(__name__)

# Initialize Bloom Filter
# Capacity 100,000 URLs, 1% false positive rate. 
# Uses ~114KB of Redis memory, well within free-tier limits.
bloom_filter = RedisBloomFilter(
    redis_client=get_redis_client(),
    key="bloom:job_urls",
    capacity=100_000,
    error_rate=0.01,
)


class JobScraperAgent(BaseAgent):
    """Agent that scrapes job boards and processes them for the RAG pipeline."""

    @property
    def name(self) -> str:
        return "job_scraper"

    async def run(self, **kwargs: Any) -> dict[str, Any]:
        """
        Execute the job scraping workflow for a specific URL.
        
        Expected kwargs:
        - url: str (The URL of the job posting to process)
        """
        url = kwargs.get("url")
        if not url:
            raise ValueError("JobScraperAgent requires a 'url' kwarg.")

        logger.info(f"🤖 JobScraperAgent starting run for URL: {url}")

        # 1. O(1) Deduplication Check via Bloom Filter
        if await bloom_filter.check(url):
            logger.info(f"URL already exists in Bloom Filter, skipping: {url}")
            return {"status": "skipped", "reason": "duplicate_url"}

        # 2. Add to Bloom Filter immediately to prevent concurrent duplicate processing
        await bloom_filter.add(url)

        # 3. Fetch and Extract using MCP Tools
        try:
            html_content = await fetch_job_page.ainvoke({"url": url})
            job_data = extract_job_details.invoke({"html_content": html_content})
        except Exception as e:
            logger.error(f"Tool execution failed for {url}: {e}", exc_info=True)
            return {"status": "failed", "reason": "tool_error", "error": str(e)}

        # 4. Save to Database
        job_data["url"] = url
        try:
            job = await create_job(job_data)
            logger.info(f"Saved job to DB: {job.id} - {job.title}")
        except Exception as e:
            logger.error(f"DB save failed for {url}: {e}", exc_info=True)
            return {"status": "failed", "reason": "db_error", "error": str(e)}

        # 5. Publish Event to trigger downstream RAG embedding
        await dispatcher.publish(
            JobScrapedEvent(
                job_id=job.id,
                url=job.url,
                title=job.title,
            )
        )

        return {
            "status": "success",
            "job_id": job.id,
            "title": job.title,
        }