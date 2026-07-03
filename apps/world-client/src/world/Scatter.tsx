'use client';

import { useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { MeshStandardNodeMaterial } from 'three/webgpu';
import { attribute, cameraPosition, float, positionLocal, smoothstep, vec3 } from 'three/tsl';
import { grassInstances, rockInstances, type ScatterInstance } from './terrain';
import { tintBySeason } from './seasonScene';

/**
 * Scatter (Ola 2 M2/M5) — pasto y rocas instanciados sobre el relieve del claro.
 *
 * Es el corazón del PARALAJE: al caminar, cientos de referencias cercanas pasan junto al avatar
 * y la velocidad SE SIENTE. Determinista (sembrado en terrain.ts), 2 draw calls (§7), y coordinado
 * con la estación (§6): pasto = superficie 'grass' (en otoño se apaga a oliva, NO copia el naranja
 * del follaje — pedido de Carlos), roca = 'ground'.
 *
 * El pasto se DESVANECE por distancia EN GPU (M5): cada brizna se encoge hacia el suelo según su
 * distancia a la cámara (atributo instanciado + smoothstep en el vertex stage) — de lejos no
 * existe, de cerca emerge suave. Cero costo de CPU por frame.
 */

/** Brizna: cono fino de 3 caras (low-poly honesto — lee como hierba a distancia). */
const GRASS_GEO = { radius: 0.05, height: 0.42, sides: 3 } as const;
/** Roca: dodecaedro achatado (canto rodado facetado). */
const ROCK_GEO = { radius: 0.32, ySquash: 0.68 } as const;

/** Colores NATURALES (base sin estación; el tinte estacional entra por tintBySeason). */
const GRASS_BASE = '#25402e';
const ROCK_BASE = '#4d4a52';

/** Fade del pasto por distancia a la cámara (m): visible pleno hasta START, desaparece en END. */
const GRASS_FADE_START = 13;
const GRASS_FADE_END = 19;

function buildInstanced(
  geo: THREE.BufferGeometry,
  mat: THREE.Material,
  items: ScatterInstance[],
  castShadow: boolean,
): THREE.InstancedMesh {
  const inst = new THREE.InstancedMesh(geo, mat, items.length);
  inst.castShadow = castShadow;
  const m = new THREE.Matrix4();
  const p = new THREE.Vector3();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const s = new THREE.Vector3();
  items.forEach((it, i) => {
    p.set(it.x, it.y, it.z);
    q.setFromEuler(e.set(it.tiltX, it.rotY, it.tiltZ));
    s.setScalar(it.scale);
    inst.setMatrixAt(i, m.compose(p, q, s));
  });
  inst.instanceMatrix.needsUpdate = true;
  return inst;
}

export default function Scatter() {
  const { grass, rocks, grassMat, rockMat, grassBase, rockBase } = useMemo(() => {
    const grassItems = grassInstances();
    // La base de la brizna nace EN el suelo (translate: el cono pivota desde su base, no su centro).
    // Sin tapa inferior (openEnded): queda contra el terreno, nunca se ve — mitad de triángulos.
    const grassGeo = new THREE.ConeGeometry(
      GRASS_GEO.radius,
      GRASS_GEO.height,
      GRASS_GEO.sides,
      1,
      true,
    ).translate(0, GRASS_GEO.height / 2, 0);
    // Origen por brizna para el fade por distancia (lo lee el vertex stage en GPU).
    const origins = new Float32Array(grassItems.length * 3);
    grassItems.forEach((it, i) => {
      origins[i * 3] = it.x;
      origins[i * 3 + 1] = it.y;
      origins[i * 3 + 2] = it.z;
    });
    grassGeo.setAttribute('instOrigin', new THREE.InstancedBufferAttribute(origins, 3));

    // La roca se hunde un pelo (asentada en la tierra, no "posada").
    const rockGeo = new THREE.DodecahedronGeometry(ROCK_GEO.radius, 0)
      .scale(1, ROCK_GEO.ySquash, 1)
      .translate(0, ROCK_GEO.radius * ROCK_GEO.ySquash * 0.72, 0);

    // Pasto: node material — la brizna se ENCOGE hacia su base según la distancia cámara↔mata.
    const grassMat = new MeshStandardNodeMaterial({ flatShading: true, roughness: 0.95 });
    grassMat.color.set(GRASS_BASE); // tintBySeason muta .color; el colorNode default lo respeta
    // Mismo idioma tipado que RainStreaks (los tipos de `attribute` no encadenan solos).
    const origin = attribute('instOrigin', 'vec3') as unknown as ReturnType<typeof vec3>;
    const dist = origin.sub(cameraPosition).length();
    const vis = float(1).sub(smoothstep(float(GRASS_FADE_START), float(GRASS_FADE_END), dist));
    grassMat.positionNode = positionLocal.mul(vec3(1, vis, 1));

    const rockMat = new THREE.MeshStandardMaterial({ color: ROCK_BASE, flatShading: true, roughness: 0.9 });

    return {
      grass: buildInstanced(grassGeo, grassMat, grassItems, false), // sin sombra: 700 briznas = ruido
      rocks: buildInstanced(rockGeo, rockMat, rockInstances(), true),
      grassMat,
      rockMat,
      grassBase: new THREE.Color(GRASS_BASE),
      rockBase: new THREE.Color(ROCK_BASE),
    };
  }, []);

  // La estación tiñe pasto (superficie propia) y roca (suelo) — §6: todo lo nuevo respira el año.
  useFrame(() => {
    tintBySeason(grassMat, grassBase, 'grass');
    tintBySeason(rockMat, rockBase, 'ground');
  });

  useEffect(
    () => () => {
      grass.geometry.dispose();
      rocks.geometry.dispose();
      grassMat.dispose();
      rockMat.dispose();
      grass.dispose();
      rocks.dispose();
    },
    [grass, rocks, grassMat, rockMat],
  );

  return (
    <>
      <primitive object={grass} />
      <primitive object={rocks} />
    </>
  );
}
