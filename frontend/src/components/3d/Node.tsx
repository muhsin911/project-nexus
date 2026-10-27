/**
 * Interactive 3D Node Component.
 * Represents a single skill, project, or experience point in the 3D space.
 */

import { useRef, useState } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import type { Mesh } from 'three';
import type { NodeData } from '@/types/3d';

interface NodeProps {
  data: NodeData;
  onHover?: (id: string | null) => void;
  onClick?: (id: string) => void;
}

export function Node({ data, onHover, onClick }: NodeProps) {
  const meshRef = useRef<Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const [active, setActive] = useState(false);

  // Subtle floating animation using sine wave, GPU-accelerated via useFrame
  useFrame((state, delta) => {
    if (!meshRef.current) return;
    
    // Bobbing motion
    const time = state.clock.elapsedTime;
    const yOffset = Math.sin(time * 1.5 + data.position[0]) * 0.1;
    
    // Smooth scale transition on hover/active
    const targetScale = hovered ? 1.25 : active ? 1.12 : data.scale ?? 1;
    const currentScale = meshRef.current.scale.x;
    const newScale = currentScale + (targetScale - currentScale) * delta * 5;
    
    meshRef.current.position.y = data.position[1] + yOffset;
    meshRef.current.scale.setScalar(newScale);
  });

  const handlePointerOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setHovered(true);
    document.body.style.cursor = 'pointer';
    onHover?.(data.id);
  };

  const handlePointerOut = () => {
    setHovered(false);
    document.body.style.cursor = 'auto';
    onHover?.(null);
  };

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    setActive(!active);
    onClick?.(data.id);
  };

  return (
    <mesh
      ref={meshRef}
      position={data.position}
      userData={{ id: data.id }}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
      onClick={handleClick}
    >
      <sphereGeometry args={[0.5, 32, 32]} />
      <meshStandardMaterial
        color={hovered ? '#ffffff' : data.color}
        emissive={data.color}
        emissiveIntensity={hovered ? 1.1 : 0.45}
        roughness={0.24}
        metalness={0.55}
      />
      <Html center distanceFactor={9} position={[0, -0.72, 0]} style={{ pointerEvents: 'none' }}>
        <span className={`scene-node-label scene-node-${data.type}`}>{data.label}</span>
      </Html>
    </mesh>
  );
}