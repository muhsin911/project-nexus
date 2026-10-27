import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { useRef } from 'react';
import type { Group } from 'three';

function DesktopComputer() {
  const { scene } = useGLTF('/models/desktop_pc/scene.gltf');
  const model = useRef<Group>(null);
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useFrame(({ clock }) => {
    if (!reduceMotion && model.current) {
      model.current.rotation.y = -0.2 + Math.sin(clock.elapsedTime * 0.18) * 0.035;
    }
  });

  return (
    <group ref={model} rotation={[-0.01, -0.2, -0.1]}>
      <primitive object={scene} scale={0.75} position={[0, -2.1, -1.3]} />
    </group>
  );
}

export function Scene() {
  return (
    <div className="scene-canvas">
      <Canvas
        camera={{ position: [16, 2.5, 6], fov: 32 }}
        dpr={[1, 1.5]}
        fallback={<div className="scene-fallback" role="status">The interactive 3D scene is unavailable in this browser.</div>}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      >
        <hemisphereLight intensity={2.2} groundColor="#51636a" />
        <ambientLight intensity={1.4} />
        <spotLight position={[-12, 18, 10]} angle={0.4} penumbra={1} intensity={5} />
        <pointLight position={[8, 2, -8]} intensity={28} color="#83eaff" />
        <pointLight position={[-8, -4, 5]} intensity={18} color="#ffd0ad" />
        <DesktopComputer />
      </Canvas>
    </div>
  );
}
