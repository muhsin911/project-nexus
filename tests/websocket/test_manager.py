"""
WebSocket Manager Tests.
Validates connection management and message routing.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock

from app.websocket.manager import WebSocketManager


@pytest.fixture
def manager():
    """Create a WebSocketManager instance."""
    return WebSocketManager()


@pytest.fixture
def mock_websocket():
    """Create a mock WebSocket connection."""
    ws = AsyncMock()
    ws.accept = AsyncMock()
    ws.send_json = AsyncMock()
    ws.close = AsyncMock()
    return ws


@pytest.mark.anyio
async def test_connect(manager, mock_websocket):
    """Test connecting a new WebSocket."""
    await manager.connect("user-1", mock_websocket)
    
    mock_websocket.accept.assert_awaited_once()
    assert manager.get_active_count() == 1


@pytest.mark.anyio
async def test_disconnect(manager, mock_websocket):
    """Test disconnecting a WebSocket."""
    await manager.connect("user-1", mock_websocket)
    await manager.disconnect("user-1")
    
    assert manager.get_active_count() == 0


@pytest.mark.anyio
async def test_session_takeover(manager):
    """Test that connecting with the same user ID closes the old connection."""
    old_ws = AsyncMock()
    old_ws.accept = AsyncMock()
    old_ws.close = AsyncMock()
    
    new_ws = AsyncMock()
    new_ws.accept = AsyncMock()
    
    await manager.connect("user-1", old_ws)
    await manager.connect("user-1", new_ws)
    
    # Old connection should be closed
    old_ws.close.assert_awaited_once()
    assert manager.get_active_count() == 1


@pytest.mark.anyio
async def test_send_personal(manager, mock_websocket):
    """Test sending a message to a specific user."""
    await manager.connect("user-1", mock_websocket)
    
    message = {"type": "test", "content": "Hello"}
    await manager.send_personal("user-1", message)
    
    mock_websocket.send_json.assert_awaited_once_with(message)


@pytest.mark.anyio
async def test_send_personal_to_nonexistent_user(manager):
    """Test sending to a user who is not connected."""
    # Should not raise an error
    await manager.send_personal("nonexistent-user", {"type": "test"})


@pytest.mark.anyio
async def test_broadcast(manager):
    """Test broadcasting a message to all connected users."""
    ws1 = AsyncMock()
    ws1.accept = AsyncMock()
    ws1.send_json = AsyncMock()
    
    ws2 = AsyncMock()
    ws2.accept = AsyncMock()
    ws2.send_json = AsyncMock()
    
    await manager.connect("user-1", ws1)
    await manager.connect("user-2", ws2)
    
    message = {"type": "broadcast", "content": "Hello everyone"}
    await manager.broadcast(message)
    
    ws1.send_json.assert_awaited_once_with(message)
    ws2.send_json.assert_awaited_once_with(message)


@pytest.mark.anyio
async def test_broadcast_handles_send_failure(manager):
    """Test that broadcast continues even if one send fails."""
    ws1 = AsyncMock()
    ws1.accept = AsyncMock()
    ws1.send_json = AsyncMock(side_effect=Exception("Send failed"))
    
    ws2 = AsyncMock()
    ws2.accept = AsyncMock()
    ws2.send_json = AsyncMock()
    
    await manager.connect("user-1", ws1)
    await manager.connect("user-2", ws2)
    
    message = {"type": "broadcast"}
    await manager.broadcast(message)
    
    # ws2 should still receive the message despite ws1 failing
    ws2.send_json.assert_awaited_once_with(message)
    
    # ws1 should be disconnected after failure
    assert manager.get_active_count() == 1