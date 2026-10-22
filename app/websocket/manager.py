"""
WebSocket Connection Manager.
Manages active WebSocket connections per FastAPI instance and supports
cross-instance messaging via Redis Pub/Sub for horizontal scaling.
"""

import asyncio
import logging
from typing import Any

from fastapi import WebSocket

logger = logging.getLogger(__name__)


class WebSocketManager:
    """
    Manages WebSocket connections for a single FastAPI instance.
    
    Architecture:
    - Local registry: {user_id: WebSocket} for connections on THIS instance
    - Redis Pub/Sub: For cross-instance messaging (broadcast, targeted)
    - Designed for consistent hashing at the load balancer level
    """

    def __init__(self) -> None:
        self._active_connections: dict[str, WebSocket] = {}
        self._lock = asyncio.Lock()

    async def connect(self, user_id: str, websocket: WebSocket) -> None:
        """Accept and register a new WebSocket connection."""
        await websocket.accept()
        async with self._lock:
            # If user already has a connection, close the old one (session takeover)
            if user_id in self._active_connections:
                old_ws = self._active_connections[user_id]
                try:
                    await old_ws.close(code=1000, reason="Replaced by new connection")
                except Exception:
                    pass
            self._active_connections[user_id] = websocket
        logger.info(f"WebSocket connected: user={user_id}, total={len(self._active_connections)}")

    async def disconnect(self, user_id: str) -> None:
        """Remove a WebSocket connection from the registry."""
        async with self._lock:
            if user_id in self._active_connections:
                del self._active_connections[user_id]
                logger.info(f"WebSocket disconnected: user={user_id}, total={len(self._active_connections)}")

    async def send_personal(self, user_id: str, message: dict[str, Any]) -> None:
        """Send a message to a specific user on THIS instance."""
        async with self._lock:
            ws = self._active_connections.get(user_id)

        if ws is None:
            logger.debug(f"User {user_id} not connected to this instance")
            return

        try:
            await ws.send_json(message)
        except Exception as e:
            logger.error(f"Failed to send to user {user_id}: {e}")
            await self.disconnect(user_id)

    async def broadcast(self, message: dict[str, Any]) -> None:
        """Broadcast a message to ALL connections on THIS instance."""
        async with self._lock:
            connections = list(self._active_connections.items())

        for user_id, ws in connections:
            try:
                await ws.send_json(message)
            except Exception as e:
                logger.error(f"Failed to broadcast to user {user_id}: {e}")
                await self.disconnect(user_id)

    def get_active_count(self) -> int:
        """Return the number of active connections on this instance."""
        return len(self._active_connections)


# Singleton instance
ws_manager = WebSocketManager()