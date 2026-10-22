/**
 * React Three Fiber JSX Type Declarations.
 * Ensures TypeScript recognizes Three.js elements like <mesh>, <sphereGeometry>, etc.
 */
import type { ThreeElements } from '@react-three/fiber';

declare global {
  namespace JSX {
    // TypeScript requires interface merging here to augment JSX intrinsic elements.
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface IntrinsicElements extends ThreeElements {}
  }
}