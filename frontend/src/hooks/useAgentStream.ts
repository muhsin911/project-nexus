/**
 * WebSocket Streaming Hook.
 * Manages real-time communication with the backend AI agent system.
 * Implements auto-reconnect, heartbeat, and message routing to Zustand.
 */

import { useCallback, useEffect, useRef } from 'react';
import { useAgentStore } from '@/store/agentStore';
import type { AgentStatus, ChatMessage } from '@/store/agentStore';

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

function isAgentStatus(status: unknown): status is AgentStatus {
  return status === 'idle' || status === 'running' || status === 'completed' || status === 'failed';
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
  const shouldReconnectRef = useRef(false);
  const connectRef = useRef<() => void>(() => {});

  const addMessage = useAgentStore((state) => state.addMessage);
  const setAgentStatus = useAgentStore((state) => state.setAgentStatus);
  const setConnectionStatus = useAgentStore((state) => state.setConnectionStatus);

  useEffect(() => {
    shouldReconnectRef.current = true;

    const clearTimers = () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };

    const scheduleReconnect = () => {
      if (!shouldReconnectRef.current) return;
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
    };

    const handleMessage = (message: WebSocketMessage) => {
      switch (message.type) {
        case 'pong':
          break;
        case 'ack':
          console.log('Message acknowledged:', message.message_id);
          break;
        case 'agent_status':
          if (message.data && typeof message.data === 'object' && 'agent' in message.data &&
            'status' in message.data && typeof message.data.agent === 'string' &&
            isAgentStatus(message.data.status)) {
            setAgentStatus(message.data.status, message.data.agent);
          }
          break;
        case 'chat':
          if (message.content) {
            addMessage({
              role: 'assistant',
              content: message.content,
              metadata: message.data as Record<string, unknown> | undefined,
            });
          }
          break;
        case 'system':
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
    };

    function connect() {
      if (!shouldReconnectRef.current) return;
      if (
        wsRef.current?.readyState === WebSocket.OPEN ||
        wsRef.current?.readyState === WebSocket.CONNECTING
      ) {
        return;
      }

      setConnectionStatus('connecting');

      try {
        const ws = new WebSocket(`${url}/${userId}`);
        wsRef.current = ws;

        ws.onopen = () => {
          setConnectionStatus('connected');
          attemptRef.current = 0;
          heartbeatIntervalRef.current = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: 'ping' }));
            }
          }, 30000);
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
          clearTimers();
          wsRef.current = null;
          scheduleReconnect();
        };
      } catch (error) {
        console.error('Failed to create WebSocket:', error);
        setConnectionStatus('error');
        scheduleReconnect();
      }
    }

    connectRef.current = connect;
    connect();

    return () => {
      shouldReconnectRef.current = false;
      clearTimers();
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close(1000, 'Component unmounting');
        wsRef.current = null;
      }
      setConnectionStatus('disconnected');
    };
  }, [addMessage, reconnectAttempts, reconnectInterval, setAgentStatus, setConnectionStatus, url, userId]);

  const sendMessage = useCallback((message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'chat',
        message_id: crypto.randomUUID(),
        ...message,
      }));
      addMessage(message);
    } else {
      console.warn('WebSocket not connected, cannot send message');
    }
  }, [addMessage]);

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

  const disconnect = useCallback(() => {
    shouldReconnectRef.current = false;
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.close(1000, 'User initiated disconnect');
      wsRef.current = null;
    }
    setConnectionStatus('disconnected');
  }, [setConnectionStatus]);

  const reconnect = useCallback(() => {
    shouldReconnectRef.current = true;
    attemptRef.current = 0;
    connectRef.current();
  }, []);

  return {
    sendMessage,
    triggerAgent,
    disconnect,
    reconnect,
  };
}
