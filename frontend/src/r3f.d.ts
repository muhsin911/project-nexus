/**
 * React Three Fiber JSX Type Declarations.
 * Ensures TypeScript recognizes Three.js elements like <mesh>, <sphereGeometry>, etc.
 */
import type { ThreeElements } from '@react-three/fiber';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements extends ThreeElements {}
  }
}