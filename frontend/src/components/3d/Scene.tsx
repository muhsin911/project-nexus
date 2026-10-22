/**
 * Main 3D Scene Component.
 * Wraps the R3F Canvas with performance optimizations, lighting, and controls.
 */

import { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { 
  PerformanceMonitor, 
  OrbitControls, 
  Environment, 
  Stars 
} from '@react-three/drei';
import { Constellation } from './Constellation';
import { NodeData, SceneConfig } from '@/types/3d';

interface SceneProps {
  nodes: NodeData[];
  config?: Partial<SceneConfig>;
  onNodeHover?: (id: string | null) => void;
  onNodeClick?: (id: string) => void;
}

export function Scene({ 
  nodes, 
  config = {}, 
  onNodeHover, 
  onNodeClick 
}: SceneProps) {
  const [dpr, setDpr] = useState(1.5); // Start with a safe, performant DPR

  const defaultConfig: SceneConfig = {
    cameraPosition: [0, 0, 15],
    enableControls: true,
    backgroundColor: '#050505',
    ...config,
  };

  return (
    <div className="absolute inset-0 w-full h-full" style={{ background: defaultConfig.backgroundColor }}>
      <Canvas
        camera={{ position: defaultConfig.cameraPosition, fov: 50 }}
        dpr={dpr}
        gl={{ 
          antialias: true, 
          alpha: true,
          powerPreference: 'high-performance'
        }}
      >
        {/* Performance Monitor: Automatically lower DPR if framerate drops below 55fps */}
        <PerformanceMonitor
          onIncline={() => setDpr((prev) => Math.min(prev + 0.25, 2))}
          onDecline={() => setDpr((prev) => Math.max(prev - 0.25, 1))}
          flipflops={3} // Wait 3 frames before changing DPR to prevent flickering
        />

        {/* Lighting */}
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1.5} castShadow />
        <pointLight position={[-10, -10, -10]} intensity={0.5} color="#4f46e5" />

        {/* Environment & Background */}
        <Environment preset="city" />
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />

        {/* Core Content */}
        <Constellation 
          nodes={nodes} 
          onNodeHover={onNodeHover} 
          onNodeClick={onNodeClick} 
        />

        {/* Camera Controls */}
        {defaultConfig.enableControls && (
          <OrbitControls 
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            minDistance={5}
            maxDistance={30}
            autoRotate={true}
            autoRotateSpeed={0.5}
          />
        )}
      </Canvas>
    </div>
  );
}