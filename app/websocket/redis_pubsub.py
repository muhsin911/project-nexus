"""
Redis Pub/Sub Bridge for WebSocket Cross-Instance Messaging.
Enables horizontal scaling by routing messages between FastAPI instances.
"""

import asyncio
import json
import logging
from typing import Any

import redis.asyncio as redis

from app.core.config import settings
from app.websocket.manager import ws_manager

logger = logging.getLogger(__name__)

# Channel naming conventions
CHANNEL_BROADCAST = "ws:broadcast"
CHANNEL_USER_PREFIX = "ws:user:"


class WebSocketPubSub:
    """
    Manages Redis Pub/Sub subscriptions for WebSocket cross-instance messaging.
    
    Channels:
    - ws:broadcast: Messages to all users across all instances
    - ws:user:{user_id}: Messages targeted to a specific user
    
    Architecture:
    - Subscribes to broadcast and pattern-matched user channels
    - Routes incoming Redis messages to local WebSocket connections
    - Provides publish methods for cross-instance messaging
    """

    def __init__(self) -> None:
        self._redis: redis.Redis | None = None
        self._pubsub: redis.client.PubSub | None = None
        self._listener_task: asyncio.Task | None = None
        self._running = False

    async def connect(self) -> None:
        """Initialize Redis connection and start the listener."""
        self._redis = redis.from_url(settings.REDIS_URL, decode_responses=True)
        self._pubsub = self._redis.pubsub()

        # Subscribe to broadcast channel
        await self._pubsub.subscribe(CHANNEL_BROADCAST)
        
        # Pattern subscription for user-specific channels
        await self._pubsub.psubscribe(f"{CHANNEL_USER_PREFIX}*")

        self._running = True
        self._listener_task = asyncio.create_task(self._listen_loop())
        logger.info("WebSocket Pub/Sub listener started")

    async def disconnect(self) -> None:
        """Cleanly shut down the Pub/Sub connection."""
        self._running = False
        if self._listener_task:
            self._listener_task.cancel()
            try:
                await self._listener_task
            except asyncio.CancelledError:
                pass

        if self._pubsub:
            await self._pubsub.unsubscribe()
            await self._pubsub.punsubscribe()
            await self._pubsub.close()

        if self._redis:
            await self._redis.close()

        logger.info("WebSocket Pub/Sub listener stopped")

    async def _listen_loop(self) -> None:
        """Listen for messages from Redis and route to local connections."""
        try:
            while self._running and self._pubsub:
                message = await self._pubsub.get_message(
                    ignore_subscribe_messages=True,
                    timeout=1.0
                )

                if message and message["type"] in ("message", "pmessage"):
                    await self._handle_message(message)
        except asyncio.CancelledError:
            logger.debug("Pub/Sub listener cancelled")
        except Exception as e:
            logger.error(f"Pub/Sub listener error: {e}", exc_info=True)

    async def _handle_message(self, message: dict[str, Any]) -> None:
        """Route a Redis message to the appropriate local handler."""
        channel = message["channel"]
        if isinstance(channel, bytes):
            channel = channel.decode("utf-8")

        data_str = message["data"]
        if isinstance(data_str, bytes):
            data_str = data_str.decode("utf-8")

        try:
            data = json.loads(data_str)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to decode Pub/Sub message: {e}")
            return

        if channel == CHANNEL_BROADCAST:
            await ws_manager.broadcast(data)
        elif channel.startswith(CHANNEL_USER_PREFIX):
            user_id = channel[len(CHANNEL_USER_PREFIX):]
            await ws_manager.send_personal(user_id, data)

    async def publish_broadcast(self, message: dict[str, Any]) -> None:
        """Publish a message to all users across all instances."""
        if not self._redis:
            logger.warning("Redis not connected, cannot publish broadcast")
            return

        await self._redis.publish(CHANNEL_BROADCAST, json.dumps(message))

    async def publish_to_user(self, user_id: str, message: dict[str, Any]) -> None:
        """Publish a message to a specific user across all instances."""
        if not self._redis:
            logger.warning("Redis not connected, cannot publish to user")
            return

        channel = f"{CHANNEL_USER_PREFIX}{user_id}"
        await self._redis.publish(channel, json.dumps(message))


# Singleton instance
ws_pubsub = WebSocketPubSub()