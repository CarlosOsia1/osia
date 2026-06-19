'use client';

import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { PointsNodeMaterial } from 'three/webgpu';
import { OSIA_COLORS } from '@osia/ui';

/**
 * Starfield — cielo estrellado node-based (S0.2 · WebGPU).
 *
 * Reemplaza a <Stars> de drei, que usa ShaderMaterial GLSL y NO corre en el
 * WebGPURenderer. PointsNodeMaterial (TSL) funciona en WebGPU y en el fallback
 * WebGL2. Distribución determinista (PRNG sembrado, sin Math.random en render)
 * sobre la cúpula celeste superior.
 */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export default function Starfield({ count = 1600, radius = 120 }: { count?: number; radius?: number }) {
  const points = useMemo(() => {
    const rnd = mulberry32(0x051a);
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const theta = rnd() * Math.PI * 2;
      const phi = Math.acos(2 * rnd() - 1);
      const r = radius * (0.6 + rnd() * 0.4);
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = Math.abs(r * Math.cos(phi)) * 0.9 + 4; // hemisferio superior (cielo)
      pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));

    const mat = new PointsNodeMaterial();
    mat.color = new THREE.Color(OSIA_COLORS.marfil);
    mat.size = 0.7;
    mat.sizeAttenuation = true;
    mat.transparent = true;
    mat.opacity = 0.85;
    mat.depthWrite = false;
    mat.blending = THREE.AdditiveBlending;

    return new THREE.Points(geo, mat);
  }, [count, radius]);

  // Los <primitive> no se auto-disponen: liberamos geo/material al desmontar.
  useEffect(
    () => () => {
      points.geometry.dispose();
      (points.material as THREE.Material).dispose();
    },
    [points],
  );

  return <primitive object={points} />;
}
