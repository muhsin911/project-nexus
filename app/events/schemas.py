"""
Event Schemas.
Defines the strict, validated contracts for all events in the system.
"""

import uuid
from datetime import datetime, timezone
from typing import Any

from pydantic import BaseModel, Field


class BaseEvent(BaseModel):
    """
    Base class for all events.
    Provides a unique identifier and timestamp for observability and deduplication.
"""
    event_id: str = Field(default_factory=lambda: str(uuid.uuid4()), description="Unique event identifier")
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), description="Event creation time")
    event_type: str = Field(description="Discriminator for the event type")

    model_config = {"frozen": True}  # Events should be immutable once created


class JobScrapedEvent(BaseEvent):
    """
    Emitted when the JobScraperAgent successfully extracts and saves a new job posting.
    Subscribers can use this to trigger RAG embedding generation or Kanban updates.
    """
    event_type: str = Field(default="job.scraped", frozen=True)
    job_id: str = Field(description="The UUID of the newly created Job record")
    url: str = Field(description="The original URL of the job posting")
    title: str = Field(description="The job title")


class JobEmbeddingGeneratedEvent(BaseEvent):
    """
    Emitted when a job's description has been successfully embedded and stored in ChromaDB.
    """
    event_type: str = Field(default="job.embedding_generated", frozen=True)
    job_id: str = Field(description="The UUID of the Job record")
    embedding_id: str = Field(description="The document ID in ChromaDB")
    status: str = Field(description="Success or failure status")


# Union type for all possible events (useful for strict typing in the dispatcher)
EventUnion = JobScrapedEvent | JobEmbeddingGeneratedEvent