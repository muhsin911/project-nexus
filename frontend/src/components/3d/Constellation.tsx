/**
 * Constellation Component.
 * Manages and renders a collection of 3D nodes.
 * Prepares the architecture for QuadTree spatial partitioning (Task 4.2).
 */

import { useMemo } from 'react';
import { Node } from './Node';
import { NodeData } from '@/types/3d';

interface ConstellationProps {
  nodes: NodeData[];
  onNodeHover?: (id: string | null) => void;
  onNodeClick?: (id: string) => void;
}

export function Constellation({ nodes, onNodeHover, onNodeClick }: ConstellationProps) {
  // Memoize nodes to prevent unnecessary re-renders during camera movement
  const renderedNodes = useMemo(() => {
    return nodes.map((node) => (
      <Node
        key={node.id}
        data={node}
        onHover={onNodeHover}
        onClick={onNodeClick}
      />
    ));
  }, [nodes, onNodeHover, onNodeClick]);

  return (
    <group name="constellation">
      {/* 
        TODO (Task 4.2): Integrate QuadTree here for frustum culling 
        when node count exceeds ~500. For now, direct rendering is 
        highly performant for < 100 interactive nodes.
      */}
      {renderedNodes}
    </group>
  );
}