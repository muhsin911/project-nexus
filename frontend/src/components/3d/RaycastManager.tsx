/**
 * Centralized Raycast Manager.
 * Provides highly performant, physics-engine-free mouse intersection for 3D objects.
 * Avoids the overhead of attaching individual event listeners to thousands of meshes.
 */

import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Group, Raycaster, Vector2 } from 'three';

interface RaycastManagerProps {
  targetRef: React.RefObject<Group | null>; // <-- UPDATED: Accept Group | null
  onHover: (id: string | null) => void;
  onClick: (id: string) => void;
}

export function RaycastManager({ targetRef, onHover, onClick }: RaycastManagerProps) {
  const { camera } = useThree();
  const raycaster = useRef(new Raycaster());
  const mouse = useRef(new Vector2(-100, -100)); // Start off-screen
  const hoveredId = useRef<string | null>(null);

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      // Normalize mouse coordinates to -1 to +1
      mouse.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.current.y = -(event.clientY / window.innerHeight) * 2 + 1;
    };

    const handleClick = () => {
      if (hoveredId.current) {
        onClick(hoveredId.current);
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('click', handleClick);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('click', handleClick);
    };
  }, [onClick]);

  useFrame(() => {
    if (!targetRef.current) return;

    // Update the picking ray with the camera and mouse position
    raycaster.current.setFromCamera(mouse.current, camera);

    // Calculate objects intersecting the picking ray
    // Note: We intersect against the children of the target group
    const intersects = raycaster.current.intersectObjects(targetRef.current.children, true);

    if (intersects.length > 0) {
      // Traverse up to find the mesh with the userData.id we set
      let object = intersects[0].object;
      while (object.parent && object.parent !== targetRef.current && !object.userData?.id) {
        object = object.parent;
      }

      const id = object.userData?.id || null;

      if (id !== hoveredId.current) {
        hoveredId.current = id;
        onHover(id);
        document.body.style.cursor = id ? 'pointer' : 'auto';
      }
    } else {
      if (hoveredId.current !== null) {
        hoveredId.current = null;
        onHover(null);
        document.body.style.cursor = 'auto';
      }
    }
  });

  return null; // This is a logic-only component, renders no JSX
}