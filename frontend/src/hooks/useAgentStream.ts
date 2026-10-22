/**
 * WebSocket Streaming Hook.
 * Manages real-time communication with the backend AI agent system.
 * Implements auto-reconnect, heartbeat, and message routing to Zustand.
 */

import { useEffect, useRef, useCallback } from 'react';
import { useAgentStore, ConnectionStatus, ChatMessage } from '@/store/agentStore';

interface UseAgentStreamOptions {
  userId: string;
  url?: string;
  reconnectAttempts?: number;
  reconnectInterval?: number;
}

interface WebSocketMessage {
  type: string;
  message_id?: string;
  status?: string;
  content?: string;
  data?: unknown;
}

export function useAgentStream({
  userId,
  url = 'ws://localhost:8000/ws',
  reconnectAttempts = 5,
  reconnectInterval = 1000,
}: UseAgentStreamOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heartbeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const attemptRef = useRef(0);

  const {
    setConnectionStatus,
    addMessage,
    setAgentStatus,
  } = useAgentStore();

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setConnectionStatus('connecting');

    try {
      const ws = new WebSocket(`${url}/${userId}`);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('✅ WebSocket connected');
        setConnectionStatus('connected');
        attemptRef.current = 0;

        // Start heartbeat
        heartbeatIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 30000); // Ping every 30 seconds
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          handleMessage(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionStatus('error');
      };

      ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        setConnectionStatus('disconnected');
        cleanup();
        attemptReconnect();
      };
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      setConnectionStatus('error');
      attemptReconnect();
    }
  }, [userId, url, setConnectionStatus]);

  // Handle incoming messages
  const handleMessage = useCallback((message: WebSocketMessage) => {
    switch (message.type) {
      case 'pong':
        // Heartbeat response, do nothing
        break;

      case 'ack':
        // Message acknowledgment
        console.log('Message acknowledged:', message.message_id);
        break;

      case 'agent_status':
        // Agent execution status update
        if (message.status && message.data) {
          const data = message.data as { agent: string; status: string };
          setAgentStatus(data.status as any, data.agent);
        }
        break;

      case 'chat':
        // Chat message from AI agent
        if (message.content) {
          addMessage({
            role: 'assistant',
            content: message.content,
            metadata: message.data as Record<string, unknown>,
          });
        }
        break;

      case 'system':
        // System notification
        if (message.content) {
          addMessage({
            role: 'system',
            content: message.content,
          });
        }
        break;

      default:
        console.warn('Unknown message type:', message.type);
    }
  }, [addMessage, setAgentStatus]);

  // Attempt reconnection with exponential backoff
  const attemptReconnect = useCallback(() => {
    if (attemptRef.current >= reconnectAttempts) {
      console.error('Max reconnection attempts reached');
      setConnectionStatus('error');
      return;
    }

    const delay = reconnectInterval * Math.pow(2, attemptRef.current);
    console.log(`Attempting reconnect in ${delay}ms (attempt ${attemptRef.current + 1})`);

    reconnectTimeoutRef.current = setTimeout(() => {
      attemptRef.current++;
      connect();
    }, delay);
  }, [connect, reconnectAttempts, reconnectInterval, setConnectionStatus]);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  // Send message to backend
  const sendMessage = useCallback((message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'chat',
        message_id: crypto.randomUUID(),
        ...message,
      }));

      // Optimistically add to store
      addMessage(message);
    } else {
      console.warn('WebSocket not connected, cannot send message');
    }
  }, [addMessage]);

  // Trigger agent execution
  const triggerAgent = useCallback((agentName: string, params: Record<string, unknown>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'agent_trigger',
        agent: agentName,
        params,
      }));

      setAgentStatus('running', agentName);
    } else {
      console.warn('WebSocket not connected, cannot trigger agent');
    }
  }, [setAgentStatus]);

  // Disconnect WebSocket
  const disconnect = useCallback(() => {
    cleanup();
    if (wsRef.current) {
      wsRef.current.close(1000, 'User initiated disconnect');
      wsRef.current = null;
    }
  }, [cleanup]);

  // Initialize connection on mount
  useEffect(() => {
    connect();

    return () => {
      cleanup();
      if (wsRef.current) {
        wsRef.current.close(1000, 'Component unmounting');
      }
    };
  }, [connect, cleanup]);

  return {
    sendMessage,
    triggerAgent,
    disconnect,
    reconnect: connect,
  };
}