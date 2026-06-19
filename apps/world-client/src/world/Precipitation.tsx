'use client';

import { useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { PointsNodeMaterial } from 'three/webgpu';
import { precipKind } from '@osia/atmosphere';
import { world } from './atmosphereRuntime';

/**
 * Precipitation (S0.7 v2) — partículas de clima: lluvia / nieve / arena. Una nube
 * de puntos en una caja que SIGUE a la cámara (envuelve siempre al jugador); los
 * puntos caen/derivan y se reciclan dentro de la caja. PointsNodeMaterial (WebGPU).
 * Se enciende solo cuando hay clima activo (lee `world.weather`).
 */

const COUNT = 1400;
const BOX = 36; // semilado de la caja alrededor de la cámara

type Cfg = { speed: number; size: number; drift: number; color: string; opacity: number };
const CFG: Record<'rain' | 'snow' | 'sand', Cfg> = {
  rain: { speed: 34, size: 0.05, drift: 1, color: '#9fb0c8', opacity: 0.45 },
  snow: { speed: 5, size: 0.16, drift: 2, color: '#eef3f8', opacity: 0.9 },
  sand: { speed: 9, size: 0.09, drift: 20, color: '#caa86a', opacity: 0.4 },
};

export default function Precipitation() {
  const camera = useThree((s) => s.camera);

  const points = useMemo(() => {
    const pos = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT * 3; i++) pos[i] = (Math.random() * 2 - 1) * BOX;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new PointsNodeMaterial();
    mat.transparent = true;
    mat.depthWrite = false;
    mat.sizeAttenuation = true;
    const p = new THREE.Points(geo, mat);
    p.frustumCulled = false;
    p.visible = false;
    return p;
  }, []);

  useFrame((_, delta) => {
    const kind = precipKind(world.weather);
    if (!kind) {
      points.visible = false;
      return;
    }
    points.visible = true;
    points.position.copy(camera.position);

    const cfg = CFG[kind];
    const mat = points.material;
    mat.color.set(cfg.color);
    mat.size = cfg.size;
    mat.opacity = cfg.opacity * Math.min(1, world.weather.intensity * 1.2);

    const attr = points.geometry.attributes.position!;
    const arr = attr.array as Float32Array;
    const dy = cfg.speed * delta;
    const dx = cfg.drift * delta;
    for (let i = 0; i < COUNT; i++) {
      const o = i * 3;
      let y = (arr[o + 1] ?? 0) - dy;
      let x = (arr[o] ?? 0) + dx;
      if (y < -BOX) {
        y += BOX * 2;
        x = (Math.random() * 2 - 1) * BOX;
        arr[o + 2] = (Math.random() * 2 - 1) * BOX;
      }
      if (x > BOX) x -= BOX * 2;
      arr[o] = x;
      arr[o + 1] = y;
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
