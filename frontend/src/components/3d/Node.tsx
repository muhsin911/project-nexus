/**
 * Interactive 3D Node Component.
 * Represents a single skill, project, or experience point in the 3D space.
 */

import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Mesh } from 'three';
import { NodeData } from '@/types/3d';

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
    const targetScale = data.scale ?? (hovered ? 1.2 : active ? 1.1 : 1.0);
    const currentScale = meshRef.current.scale.x;
    const newScale = currentScale + (targetScale - currentScale) * delta * 5;
    
    meshRef.current.position.y = data.position[1] + yOffset;
    meshRef.current.scale.setScalar(newScale);
  });

  const handlePointerOver = (e: any) => {
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

  const handleClick = (e: any) => {
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
        emissiveIntensity={hovered ? 0.8 : 0.2}
        roughness={0.3}
        metalness={0.8}
      />
    </mesh>
  );
}