'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { PointsNodeMaterial } from 'three/webgpu';
import { uniform, attribute } from 'three/tsl';
import { precipKind } from '@osia/atmosphere';
import { world } from './atmosphereRuntime';

/**
 * Precipitation (S0.7 v2) — partículas de clima ORGÁNICAS y DENSAS: cada partícula
 * tiene su propia fase, velocidad y TAMAÑO (0.5×–1.5× random), y se mueve con
 * seno/coseno.
 *   · lluvia: vertical, muy rápida, densa, leve jitter.
 *   · nieve: lenta, deriva en varias direcciones (sway 2D + viento).
 *   · arena: casi horizontal con ondulación seno/coseno (no recta).
 *   · niebla: jirones grandes, lentos y suaves.
 * Caja que SIGUE a la cámara; reciclado por wrap en los 3 ejes.
 */

const COUNT = 11000;
const BOX = 36; // semilado de la caja alrededor de la cámara

type Cfg = { fall: number; size: number; drift: number; color: string; opacity: number };
const CFG: Record<'rain' | 'snow' | 'sand' | 'fog', Cfg> = {
  rain: { fall: 32, size: 0.06, drift: 0, color: '#9fb0c8', opacity: 0.5 },
  snow: { fall: 3.4, size: 0.26, drift: 1.7, color: '#f2f6fb', opacity: 0.95 },
  sand: { fall: 0, size: 0.1, drift: 17, color: '#caa86a', opacity: 0.45 },
  fog: { fall: 0.5, size: 3.4, drift: 0.6, color: '#cfcabf', opacity: 0.1 },
};

export default function Precipitation() {
  const camera = useThree((s) => s.camera);
  const tRef = useRef(0);
  const sizeU = useMemo(() => uniform(0.1), []);

  // semillas estables por partícula: fase + factor de velocidad
  const seeds = useMemo(() => {
    const phase = new Float32Array(COUNT);
    const speed = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
      phase[i] = Math.random() * Math.PI * 2;
      speed[i] = 0.6 + Math.random() * 0.8;
    }
    return { phase, speed };
  }, []);

  const points = useMemo(() => {
    const pos = new Float32Array(COUNT * 3);
    const aSize = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
      pos[i * 3] = (Math.random() * 2 - 1) * BOX;
      pos[i * 3 + 1] = (Math.random() * 2 - 1) * BOX;
      pos[i * 3 + 2] = (Math.random() * 2 - 1) * BOX;
      aSize[i] = 0.5 + Math.random(); // 0.5×–1.5×
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(aSize, 1));

    const mat = new PointsNodeMaterial();
    mat.transparent = true;
    mat.depthWrite = false;
    mat.sizeAttenuation = true;
    mat.fog = false;
    mat.sizeNode = sizeU.mul(attribute('aSize', 'float')); // tamaño por-partícula

    const p = new THREE.Points(geo, mat);
    p.frustumCulled = false;
    p.visible = false;
    return p;
  }, [sizeU]);

  useFrame((_, delta) => {
    const kind = precipKind(world.weather);
    // la lluvia y la arena las dibuja RainStreaks (líneas); aquí solo nieve/niebla.
    if (kind !== 'snow' && kind !== 'fog') {
      points.visible = false;
      return;
    }
    points.visible = true;
    points.position.copy(camera.position);
    tRef.current += delta;
    const t = tRef.current;

    const cfg = CFG[kind];
    const mat = points.material;
    mat.color.set(cfg.color);
    sizeU.value = cfg.size;
    mat.opacity = cfg.opacity * Math.min(1, world.weather.intensity * 1.2);

    const attr = points.geometry.attributes.position!;
    const arr = attr.array as Float32Array;
    const { phase, speed } = seeds;

    for (let i = 0; i < COUNT; i++) {
      const o = i * 3;
      const ph = phase[i] ?? 0;
      const sp = speed[i] ?? 1;
      let x = arr[o] ?? 0;
      let y = arr[o + 1] ?? 0;
      let z = arr[o + 2] ?? 0;

      if (kind === 'snow') {
        y -= cfg.fall * sp * delta;
        x += (Math.sin(t * 1.4 + ph) * 1.5 + cfg.drift) * delta; // sway + viento
        z += Math.cos(t * 1.1 + ph * 1.7) * 1.5 * delta;
      } else {
        // niebla: jirones que flotan
        y -= cfg.fall * sp * delta;
        x += Math.sin(t * 0.3 + ph) * 0.7 * delta;
        z += Math.cos(t * 0.25 + ph) * 0.7 * delta;
      }

      if (y < -BOX) {
        y += BOX * 2;
        x = (Math.random() * 2 - 1) * BOX;
        z = (Math.random() * 2 - 1) * BOX;
      } else if (y > BOX) {
        y -= BOX * 2;
      }
      if (x > BOX) x -= BOX * 2;
      else if (x < -BOX) x += BOX * 2;
      if (z > BOX) z -= BOX * 2;
      else if (z < -BOX) z += BOX * 2;

      arr[o] = x;
      arr[o + 1] = y;
      arr[o + 2] = z;
    }
    attr.needsUpdate = true;
  });

  useEffect(
    () => () => {
      points.geometry.dispose();
      (points.material as THREE.Material).dispose();
    },
    [points],
  );

  return <primitive object={points} />;
}
