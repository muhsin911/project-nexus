"""
WebSocket Endpoints.
Provides the main WebSocket connection point for real-time AI streaming.
"""

import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.websocket.manager import ws_manager

logger = logging.getLogger(__name__)

router = APIRouter(tags=["WebSocket"])


@router.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str) -> None:
    """
    Main WebSocket endpoint for real-time communication.
    
    Supports:
    - Connection lifecycle management
    - Ping/pong keepalive
    - Graceful disconnection handling
    - Message routing to AI agents (future)
    """
    await ws_manager.connect(user_id, websocket)

    try:
        while True:
            # Receive messages from the client
            data = await websocket.receive_json()

            # Handle different message types
            msg_type = data.get("type")

            if msg_type == "ping":
                # Respond to keepalive pings
                await websocket.send_json({"type": "pong"})
            elif msg_type == "chat":
                # Future: Route to AI agent for processing
                logger.info(f"Received chat message from user {user_id}: {data.get('message', '')[:50]}")
                await websocket.send_json({
                    "type": "ack",
                    "message_id": data.get("message_id"),
                    "status": "received"
                })
            else:
                logger.warning(f"Unknown message type from user {user_id}: {msg_type}")

    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected: user={user_id}")
    except Exception as e:
        logger.error(f"WebSocket error for user {user_id}: {e}", exc_info=True)
    finally:
        await ws_manager.disconnect(user_id)