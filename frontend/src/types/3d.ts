/**
 * 3D Entity Types.
 * Shared interfaces for React Three Fiber components and state management.
 */

export type NodeType = 'skill' | 'project' | 'experience';

export interface NodeData {
  id: string;
  type: NodeType;
  label: string;
  description?: string;
  position: [number, number, number];
  color: string;
  scale?: number;
  metadata?: Record<string, unknown>;
}

export interface SceneConfig {
  cameraPosition: [number, number, number];
  enableControls: boolean;
  backgroundColor: string;
}