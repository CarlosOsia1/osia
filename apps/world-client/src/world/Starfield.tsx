'use client';

import { useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { PointsNodeMaterial } from 'three/webgpu';
import { mulberry32 } from '@osia/atmosphere';
import { OSIA_COLORS } from '@osia/ui';
import { atmo } from './atmosphereRuntime';

/**
 * Starfield — cielo estrellado node-based (S0.2 · WebGPU).
 *
 * Reemplaza a <Stars> de drei, que usa ShaderMaterial GLSL y NO corre en el
 * WebGPURenderer. PointsNodeMaterial (TSL) funciona en WebGPU y en el fallback
 * WebGL2. Distribución determinista (PRNG sembrado de @osia/atmosphere, sin
 * Math.random en render) sobre la cúpula celeste superior.
 */
export default function Starfield({ count = 1600, radius = 120 }: { count?: number; radius?: number }) {
  const camera = useThree((s) => s.camera);
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
    mat.size = 0.9;
    mat.sizeAttenuation = true;
    mat.transparent = true;
    mat.opacity = 0.85;
    mat.depthWrite = false;
    mat.fog = false; // las estrellas NUNCA se borran con la niebla (estaban invisibles de noche)
    mat.blending = THREE.AdditiveBlending;

    return new THREE.Points(geo, mat);
  }, [count, radius]);

  // Las estrellas aparecen de noche y se apagan de día (las controla la atmósfera).
  useFrame(() => {
    // La esfera de estrellas SIGUE a la cámara → distancia "infinita", sin parallax al
    // caminar: las estrellas se ven estáticas y lejanas (no se mueven con el jugador).
    points.position.copy(camera.position);
    points.material.opacity = 0.9 * atmo.current.starsIntensity;
  });

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
