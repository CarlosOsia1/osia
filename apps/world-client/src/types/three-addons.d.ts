/**
 * Tipos puente para addons TSL de three que @types/three aún no cubre durante la
 * transición a WebGPU (mediados 2026). El runtime existe (three/addons/...), solo
 * faltan los .d.ts. Borrar cuando @types/three los incluya oficialmente.
 */
declare module 'three/addons/tsl/display/BloomNode.js' {
  import type { Node } from 'three/tsl';
  /** bloom(input, strength?, radius?, threshold?) → nodo con la contribución de bloom. */
  export function bloom(node: Node, strength?: number, radius?: number, threshold?: number): Node;
}
