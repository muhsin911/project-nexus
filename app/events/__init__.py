"""
Events Module.
Exposes the dispatcher and schemas for use across the application.
 """

from app.events.dispatcher import dispatcher, get_event_dispatcher
from app.events.schemas import BaseEvent, JobScrapedEvent, JobEmbeddingGeneratedEvent

__all__ = [
    "dispatcher",
    "get_event_dispatcher",
    "BaseEvent",
    "JobScrapedEvent",
    "JobEmbeddingGeneratedEvent",
]