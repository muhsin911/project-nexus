/**
 * Constellation Component.
 * Manages and renders a collection of 3D nodes using QuadTree spatial partitioning
 * for high-performance frustum culling.
 */

import { useMemo, useRef } from 'react';
import { Group } from 'three';
import { useThree } from '@react-three/fiber';
import { Node } from './Node';
import { RaycastManager } from './RaycastManager';
import { QuadTree, Rectangle } from '@/utils/quadtree'; // <-- REMOVED: Point3D
import { NodeData } from '@/types/3d';

interface ConstellationProps {
  nodes: NodeData[];
  onNodeHover?: (id: string | null) => void;
  onNodeClick?: (id: string) => void;
}

export function Constellation({ nodes, onNodeHover, onNodeClick }: ConstellationProps) {
  const groupRef = useRef<Group>(null);
  const { camera } = useThree();

  // 1. Build the QuadTree once when nodes change
  const quadTree = useMemo(() => {
    const qt = new QuadTree({ x: 0, y: 0, w: 200, h: 200 }, 8); // Large boundary, capacity 8
    
    nodes.forEach((node) => {
      qt.insert({
        id: node.id,
        x: node.position[0],
        y: node.position[2], // Map 3D Z to 2D Y for the QuadTree
        z: node.position[1], // Map 3D Y to 2D Z (height, unused in 2D tree but kept for reference)
        data: node,
      });
    });
    
    return qt;
  }, [nodes]);

  // 2. Query visible nodes based on camera position (Frustum Culling approximation)
  const visibleNodes = useMemo(() => {
    if (!camera) return [];

    // Define a query range centered on the camera's X/Z position
    const viewDistance = 30; // Adjust based on camera FOV and desired render distance
    const queryRange: Rectangle = {
      x: camera.position.x,
      y: camera.position.z,
      w: viewDistance * 2,
      h: viewDistance * 2,
    };

    const visiblePoints = quadTree.query(queryRange);
    
    return visiblePoints.map((p) => p.data as NodeData);
  }, [quadTree, camera]);

  return (
    <group ref={groupRef} name="constellation">
      {/* Render ONLY the culled, visible nodes */}
      {visibleNodes.map((node) => (
        <Node
          key={node.id}
          data={node}
          onHover={onNodeHover}
          onClick={onNodeClick}
        />
      ))}

      {/* Centralized Raycasting for all children in this group */}
      <RaycastManager
        targetRef={groupRef}
        onHover={onNodeHover || (() => {})}
        onClick={onNodeClick || (() => {})}
      />
    </group>
  );
}