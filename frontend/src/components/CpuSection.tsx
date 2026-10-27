import { useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import type { Group } from 'three';

function CpuModel({ turbo, onToggle }: { turbo: boolean; onToggle: () => void }) {
  const group = useRef<Group>(null);
  const { pointer } = useThree();
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useFrame(({ clock }, delta) => {
    if (!group.current) return;
    const speed = reduceMotion ? 0 : turbo ? 0.8 : 0;
    group.current.rotation.y += speed * delta;
    group.current.rotation.x += (-pointer.y * 0.16 - group.current.rotation.x) * 0.035;
    group.current.rotation.z += (pointer.x * 0.16 - group.current.rotation.z) * 0.035;
    group.current.position.y = reduceMotion || !turbo
      ? 0
      : Math.sin(clock.elapsedTime * 1.6) * 0.05;
  });

  const pins = Array.from({ length: 12 }, (_, index) => (index - 5.5) * 0.22);

  return (
    <group
      ref={group}
      onClick={onToggle}
      onPointerOver={(event) => {
        event.stopPropagation();
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = '';
      }}
    >
      <mesh position={[0, -0.12, 0]} receiveShadow>
        <boxGeometry args={[4.2, 0.28, 3.2]} />
        <meshStandardMaterial color="#0d232c" metalness={0.7} roughness={0.32} />
      </mesh>
      <mesh position={[0, 0.08, 0]}>
        <boxGeometry args={[2.18, 0.34, 2.18]} />
        <meshStandardMaterial color="#1a3137" metalness={0.72} roughness={0.28} />
      </mesh>
      <mesh position={[0, 0.3, 0]}>
        <boxGeometry args={[1.78, 0.12, 1.78]} />
        <meshStandardMaterial
          color={turbo ? '#8af5ff' : '#54b9c7'}
          emissive={turbo ? '#1eaec4' : '#0a3a45'}
          emissiveIntensity={turbo ? 1.5 : 0.45}
          metalness={0.58}
          roughness={0.22}
        />
      </mesh>
      <mesh position={[0, 0.38, 0.94]}>
        <boxGeometry args={[0.52, 0.03, 0.02]} />
        <meshBasicMaterial color={turbo ? '#b5fbff' : '#89e8ef'} />
      </mesh>
      {pins.flatMap((position) => [
        <mesh key={`x-${position}`} position={[position, -0.31, 1.58]}>
          <boxGeometry args={[0.075, 0.16, 0.38]} />
          <meshStandardMaterial color="#b3c5c4" metalness={0.8} roughness={0.2} />
        </mesh>,
        <mesh key={`z-${position}`} position={[position, -0.31, -1.58]}>
          <boxGeometry args={[0.075, 0.16, 0.38]} />
          <meshStandardMaterial color="#b3c5c4" metalness={0.8} roughness={0.2} />
        </mesh>,
        <mesh key={`left-${position}`} position={[-2.08, -0.31, position]}>
          <boxGeometry args={[0.38, 0.16, 0.075]} />
          <meshStandardMaterial color="#b3c5c4" metalness={0.8} roughness={0.2} />
        </mesh>,
        <mesh key={`right-${position}`} position={[2.08, -0.31, position]}>
          <boxGeometry args={[0.38, 0.16, 0.075]} />
          <meshStandardMaterial color="#b3c5c4" metalness={0.8} roughness={0.2} />
        </mesh>,
      ])}
    </group>
  );
}

export function CpuSection() {
  const [turbo, setTurbo] = useState(false);

  return (
    <section className="cpu-section section-wrap" aria-labelledby="cpu-heading">
      <div className="cpu-copy">
        <p className="eyebrow">A SMALL INTERACTIVE DETAIL</p>
        <h2 id="cpu-heading">Built to<br /><em>think.</em></h2>
        <p>Move your pointer to turn the processor. Click it to switch on turbo mode.</p>
        <button className="cpu-toggle" type="button" onClick={() => setTurbo((enabled) => !enabled)}>
          {turbo ? 'Turbo mode on' : 'Activate turbo mode'} <span aria-hidden="true">↗</span>
        </button>
      </div>
      <div className="cpu-canvas" aria-label="Interactive 3D processor model" role="group">
        <Canvas camera={{ position: [6, 4.3, 7], fov: 35 }} dpr={[1, 1.5]} gl={{ alpha: true, antialias: true }}>
          <ambientLight intensity={1.3} />
          <directionalLight position={[4, 8, 6]} intensity={3} color="#c6f5ff" />
          <pointLight position={[-4, 2, -3]} intensity={turbo ? 30 : 14} color={turbo ? '#32edff' : '#227f96'} />
          <CpuModel turbo={turbo} onToggle={() => setTurbo((enabled) => !enabled)} />
        </Canvas>
      </div>
    </section>
  );
}
