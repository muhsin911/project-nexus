/**
 * Constellation Component.
 * Arranges a small portfolio of projects, skills, and experience as an interactive 3D constellation.
 */

import { Line } from '@react-three/drei';
import { Node } from './Node';
import type { NodeData } from '@/types/3d';

interface ConstellationProps {
  nodes: NodeData[];
  onNodeHover?: (id: string | null) => void;
  onNodeClick?: (id: string) => void;
}

export function Constellation({ nodes, onNodeHover, onNodeClick }: ConstellationProps) {
  return (
    <group name="constellation">
      <mesh>
        <icosahedronGeometry args={[0.72, 1]} />
        <meshStandardMaterial color="#0a2530" emissive="#0c7189" emissiveIntensity={0.8} wireframe />
      </mesh>
      {nodes.map((node) => (
        <Line
          key={`link-${node.id}`}
          points={[[0, 0, 0], node.position]}
          color={node.color}
          transparent
          opacity={0.2}
          lineWidth={0.6}
        />
      ))}
      {nodes.map((node) => (
        <Node
          key={node.id}
          data={node}
          onHover={onNodeHover}
          onClick={onNodeClick}
        />
      ))}
    </group>
  );
}