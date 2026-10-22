/**
 * Agent State Store (Zustand).
 * Centralizes all AI agent and UI interaction state.
 * Provides a single source of truth for the 3D scene and WebSocket communication.
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { NodeData } from '@/types/3d';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';
export type AgentStatus = 'idle' | 'running' | 'completed' | 'failed';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

interface AgentState {
  // Connection state
  connectionStatus: ConnectionStatus;
  
  // Agent execution state
  agentStatus: AgentStatus;
  currentAgent: string | null;
  
  // UI interaction state
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
  
  // Chat/message history
  messages: ChatMessage[];
  
  // 3D scene data
  nodes: NodeData[];
  
  // Actions
  setConnectionStatus: (status: ConnectionStatus) => void;
  setAgentStatus: (status: AgentStatus, agent?: string) => void;
  setSelectedNode: (id: string | null) => void;
  setHoveredNode: (id: string | null) => void;
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  clearMessages: () => void;
  setNodes: (nodes: NodeData[]) => void;
}

export const useAgentStore = create<AgentState>()(
  devtools(
    (set) => ({
      // Initial state
      connectionStatus: 'disconnected',
      agentStatus: 'idle',
      currentAgent: null,
      selectedNodeId: null,
      hoveredNodeId: null,
      messages: [],
      nodes: [],
      
      // Actions
      setConnectionStatus: (status) => set({ connectionStatus: status }),
      
      setAgentStatus: (status, agent) => 
        set({ 
          agentStatus: status, 
          currentAgent: agent || null 
        }),
      
      setSelectedNode: (id) => set({ selectedNodeId: id }),
      
      setHoveredNode: (id) => set({ hoveredNodeId: id }),
      
      addMessage: (message) => 
        set((state) => ({
          messages: [
            ...state.messages,
            {
              ...message,
              id: crypto.randomUUID(),
              timestamp: Date.now(),
            },
          ],
        })),
      
      clearMessages: () => set({ messages: [] }),
      
      setNodes: (nodes) => set({ nodes }),
    }),
    { name: 'agent-store' }
  )
);