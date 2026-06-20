'use client';

import { useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { MeshBasicNodeMaterial } from 'three/webgpu';
import { uniform, positionLocal, range, vec3, sin, cos, float, mod } from 'three/tsl';
import { precipKind } from '@osia/atmosphere';
import { world } from './atmosphereRuntime';
import { SNOW, FX_BOX } from './weatherConfig';

/**
 * Precipitation (S0.7 v5) — NIEVE simulada EN GPU. Cada copo es una instancia (icosaedro
 * low-poly) cuya posición la calcula el SHADER (TSL positionNode) desde un uniform de
 * tiempo + valores aleatorios por instancia (`range`): caída + viento + sway + wrap en
 * una caja, todo en la GPU. La CPU ya NO recorre 30k copos por frame (antes: 30k
 * matrices + ~1.9MB re-subidos/frame → stutter); ahora solo avanza 1 número (el tiempo).
 *
 * La caja SIGUE a la cámara (nevada infinita). El tamaño SÍ se respeta (instancias 3D;
 * en WebGPU los Points miden 1px). Config en weatherConfig.ts.
 */

export default function Precipitation() {
  const camera = useThree((s) => s.camera);
  const timeU = useMemo(() => uniform(0), []);

  const mesh = useMemo(() => {
    const geo = new THREE.IcosahedronGeometry(SNOW.size, 0); // blob low-poly
    geo.deleteAttribute('normal'); // unlit + sin map → no se usan (ahorra vertex buffers en WebGPU)
    geo.deleteAttribute('uv');
    const mat = new MeshBasicNodeMaterial();
    mat.color = new THREE.Color(SNOW.color);
    mat.transparent = true;
    mat.opacity = SNOW.opacity;
    mat.depthWrite = false;
    mat.fog = false;

    // --- simulación EN GPU: posición por instancia desde `range` + tiempo ---
    // WebGPU permite MÁX 8 vertex buffers → agrupo los aleatorios en 2 `range` de vec3
    // (no 6 escalares, que serían 6 buffers).
    const B = float(FX_BOX);
    const B2 = float(FX_BOX * 2);
    const base = range(new THREE.Vector3(-FX_BOX, -FX_BOX, -FX_BOX), new THREE.Vector3(FX_BOX, FX_BOX, FX_BOX));
    const rnd = range(new THREE.Vector3(0.6, 0, 0.6), new THREE.Vector3(1.4, Math.PI * 2, 0.6 + SNOW.sizeVar));
    const bx = base.x; // posición base (aleatoria por copo)
    const by = base.y;
    const bz = base.z;
    const sp = rnd.x; // factor de velocidad
    const ph = rnd.y; // fase
    const sz = rnd.z; // factor de tamaño por copo

    // caída + wrap en [-B, B)
    const yFall = by.sub(timeU.mul(sp).mul(SNOW.fall));
    const y = mod(yFall.add(B), B2).sub(B);
    // viento lateral (constante) con wrap + sway (seno, fuera del wrap)
    const xWrap = mod(bx.add(timeU.mul(SNOW.drift)).add(B), B2).sub(B);
    const x = xWrap.add(sin(timeU.mul(1.4).add(ph)).mul(1.5));
    const z = bz.add(cos(timeU.mul(1.1).add(ph.mul(1.7))).mul(1.5));

    mat.positionNode = positionLocal.mul(sz).add(vec3(x, y, z));

    const m = new THREE.InstancedMesh(geo, mat, SNOW.count);
    m.frustumCulled = false;
    m.visible = false;
    // matrices identidad: el positionNode hace TODO el movimiento/escala.
    const id = new THREE.Matrix4();
    for (let i = 0; i < SNOW.count; i++) m.setMatrixAt(i, id);
    m.instanceMatrix.needsUpdate = true;
    return m;
  }, [timeU]);

  useFrame((_, delta) => {
    const kind = precipKind(world.weather);
    if (kind !== 'snow') {
      mesh.visible = false;
      return;
    }
    mesh.visible = true;
    mesh.position.copy(camera.position); // la caja sigue al jugador
    timeU.value += delta; // ← único trabajo de CPU por frame
    (mesh.material as MeshBasicNodeMaterial).opacity =
      SNOW.opacity * Math.min(1, world.weather.intensity * 1.2);
  });

  useEffect(
    () => () => {
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
      mesh.dispose();
    },
    [mesh],
  );

  return <primitive object={mesh} />;
}
