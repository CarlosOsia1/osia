'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { precipKind } from '@osia/atmosphere';
import { world, atmo } from './atmosphereRuntime';

// La lluvia/arena se tiñen con el día/noche (no un azul claro fijo que se ve mal de noche).
const RAIN_DAY = new THREE.Color('#b3c2da');
const RAIN_NIGHT = new THREE.Color('#39435e');
const SAND_DAY = new THREE.Color('#cda86a');
const SAND_NIGHT = new THREE.Color('#6e5a40');

/**
 * RainStreaks (S0.7 v2) — lluvia y arena como STREAKS (segmentos de línea), como
 * en los juegos: rayas estiradas, no puntos (que eran invisibles). Cada gota es un
 * segmento que cae rápido vertical (lluvia) o cruza horizontal con ondulación
 * (arena). LineSegments + LineBasicMaterial (WebGPU lo auto-convierte). Caja que
 * sigue a la cámara; reciclado por wrap. (Nieve/niebla siguen como puntos.)
 */

const COUNT = 4500;
const BOX = 36;

export default function RainStreaks() {
  const camera = useThree((s) => s.camera);
  const tRef = useRef(0);

  const seeds = useMemo(() => {
    const phase = new Float32Array(COUNT);
    const speed = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
      phase[i] = Math.random() * Math.PI * 2;
      speed[i] = 0.7 + Math.random() * 0.6;
    }
    return { phase, speed };
  }, []);

  const bases = useMemo(() => {
    const b = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT * 3; i++) b[i] = (Math.random() * 2 - 1) * BOX;
    return b;
  }, []);

  const lines = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(COUNT * 6), 3));
    const mat = new THREE.LineBasicMaterial({ transparent: true, depthWrite: false });
    mat.fog = false;
    const seg = new THREE.LineSegments(geo, mat);
    seg.frustumCulled = false;
    seg.visible = false;
    return seg;
  }, []);

  useFrame((_, delta) => {
    const kind = precipKind(world.weather);
    if (kind !== 'rain' && kind !== 'sand') {
      lines.visible = false;
      return;
    }
    lines.visible = true;
    lines.position.copy(camera.position);
    tRef.current += delta;
    const t = tRef.current;
    const isRain = kind === 'rain';

    const night = atmo.current.starsIntensity; // 0 día → 1 noche
    const mat = lines.material as THREE.LineBasicMaterial;
    if (isRain) mat.color.copy(RAIN_DAY).lerp(RAIN_NIGHT, night);
    else mat.color.copy(SAND_DAY).lerp(SAND_NIGHT, night);
    mat.opacity = (isRain ? 0.55 : 0.5) * Math.min(1, world.weather.intensity * 1.3);

    const len = isRain ? 0.9 : 1.6;
    const fall = isRain ? 38 : 0;
    const { phase, speed } = seeds;
    const arr = lines.geometry.attributes.position!.array as Float32Array;

    for (let i = 0; i < COUNT; i++) {
      const o3 = i * 3;
      const ph = phase[i] ?? 0;
      const sp = speed[i] ?? 1;
      let bx = bases[o3] ?? 0;
      let by = bases[o3 + 1] ?? 0;
      let bz = bases[o3 + 2] ?? 0;

      if (isRain) {
        by -= fall * sp * delta;
        bx += Math.sin(t * 8 + ph) * 0.25 * delta;
      } else {
        bx += (16 * sp + Math.sin(t * 4 + ph) * 5) * delta;
        by += Math.sin(t * 3 + ph * 1.3) * 1.6 * delta;
        bz += Math.cos(t * 2.3 + ph) * 2.0 * delta;
      }

      if (by < -BOX) {
        by += BOX * 2;
        bx = (Math.random() * 2 - 1) * BOX;
        bz = (Math.random() * 2 - 1) * BOX;
      } else if (by > BOX) {
        by -= BOX * 2;
      }
      if (bx > BOX) bx -= BOX * 2;
      else if (bx < -BOX) bx += BOX * 2;
      if (bz > BOX) bz -= BOX * 2;
      else if (bz < -BOX) bz += BOX * 2;

      bases[o3] = bx;
      bases[o3 + 1] = by;
      bases[o3 + 2] = bz;

      // segmento: A = base, B = punta (arriba en lluvia, trailing en arena)
      const o6 = i * 6;
      arr[o6] = bx;
      arr[o6 + 1] = by;
      arr[o6 + 2] = bz;
      arr[o6 + 3] = isRain ? bx : bx - len;
      arr[o6 + 4] = isRain ? by + len : by;
      arr[o6 + 5] = bz;
    }
    lines.geometry.attributes.position!.needsUpdate = true;
  });

  useEffect(
    () => () => {
      lines.geometry.dispose();
      (lines.material as THREE.Material).dispose();
    },
    [lines],
  );

  return <primitive object={lines} />;
}
