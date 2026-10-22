"""
Async Event Dispatcher (Observer Pattern).
Manages the registration of subscribers and the asynchronous publication of events.
Designed to be non-blocking and fault-tolerant.
"""

import asyncio
import logging
from collections.abc import Awaitable, Callable
from functools import lru_cache
from typing import Type, TypeVar

from app.events.schemas import BaseEvent

logger = logging.getLogger(__name__)

# Type alias for an async subscriber callback
SubscriberCallback = Callable[[BaseEvent], Awaitable[None]]
TEvent = TypeVar("TEvent", bound=BaseEvent)


class EventDispatcher:
    """
    Async Singleton Event Dispatcher.
    
    Maintains a registry of event types mapped to lists of subscriber callbacks.
    Uses asyncio locks to ensure thread-safe subscription management during runtime.
    """

    def __init__(self) -> None:
        # Maps an event class type to a list of async callback functions
        self._subscribers: dict[Type[BaseEvent], list[SubscriberCallback]] = {}
        self._lock = asyncio.Lock()

    async def subscribe(self, event_type: Type[TEvent], callback: SubscriberCallback) -> None:
        """
        Register a callback to be executed when a specific event type is published.
        
        Args:
            event_type: The Pydantic model class of the event to listen for.
            callback: The async function to execute. Must accept the event instance.
        """
        async with self._lock:
            if event_type not in self._subscribers:
                self._subscribers[event_type] = []
            
            # Prevent duplicate subscriptions of the exact same callback
            if callback not in self._subscribers[event_type]:
                self._subscribers[event_type].append(callback)
                logger.debug(f"Subscribed {callback.__name__} to {event_type.__name__}")

    async def unsubscribe(self, event_type: Type[TEvent], callback: SubscriberCallback) -> None:
        """Remove a specific callback from an event type's subscriber list."""
        async with self._lock:
            if event_type in self._subscribers and callback in self._subscribers[event_type]:
                self._subscribers[event_type].remove(callback)
                logger.debug(f"Unsubscribed {callback.__name__} from {event_type.__name__}")

    async def publish(self, event: BaseEvent) -> None:
        """
        Publish an event to all registered subscribers for its type.
        
        Fault-tolerant: If one subscriber raises an exception, it is logged,
        and the remaining subscribers for this event will still execute.
        """
        event_type = type(event)
        
        async with self._lock:
            # Get a copy of the subscribers list to avoid mutation issues during iteration
            subscribers = list(self._subscribers.get(event_type, []))

        if not subscribers:
            logger.debug(f"No subscribers for event type: {event_type.__name__}")
            return

        logger.info(f"Publishing {event_type.__name__} (ID: {event.event_id}) to {len(subscribers)} subscriber(s)")

        # Execute all subscribers concurrently
        # We use a loop with individual try/except to ensure one failure doesn't kill the batch
        for callback in subscribers:
            try:
                await callback(event)
            except Exception as e:
                # In Phase 5, this will be upgraded to structlog with request_id context
                logger.error(
                    f"Subscriber {callback.__name__} failed to process {event_type.__name__}: {e}",
                    exc_info=True,
                )


@lru_cache(maxsize=1)
def get_event_dispatcher() -> EventDispatcher:
    """
    Singleton factory for the Event Dispatcher.
    Ensures only one instance exists across the application lifecycle.
    """
    return EventDispatcher()


# Convenience export
dispatcher = get_event_dispatcher()