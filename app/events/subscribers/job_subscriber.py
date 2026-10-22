"""
Job Event Subscribers.
Contains the business logic that reacts to specific job-related events.
"""

import logging

from app.events.dispatcher import dispatcher
from app.events.schemas import JobScrapedEvent, JobEmbeddingGeneratedEvent

logger = logging.getLogger(__name__)


async def on_job_scraped(event: JobScrapedEvent) -> None:
    """
    Observer callback for JobScrapedEvent.
    
    In a full implementation, this would:
    1. Fetch the full job description from the DB using event.job_id.
    2. Generate an embedding via the LLM provider.
    3. Upsert into ChromaDB.
    4. Publish a JobEmbeddingGeneratedEvent upon success.
    
    For this phase, we log the reception to prove the Observer pattern is wired correctly.
    """
    logger.info(f"👀 Observer triggered: Received JobScrapedEvent for '{event.title}' ({event.job_id})")
    
    # Simulate async background work (e.g., calling an embedding API)
    # await asyncio.sleep(0.1) 
    
    # Future: 
    # embedding_id = await generate_and_store_embedding(event.job_id)
    # await dispatcher.publish(JobEmbeddingGeneratedEvent(job_id=event.job_id, embedding_id=embedding_id, status="success"))


def register_job_subscribers() -> None:
    """
    Registers all job-related subscribers with the global dispatcher.
    Call this once during application startup (e.g., in main.py lifespan).
    """
    # Note: We use asyncio.run or await this in an async context. 
    # Since lifespan is async, we will call it properly there.
    pass # We will handle the async registration in main.py lifespan