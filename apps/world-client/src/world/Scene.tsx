'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { MeshStandardNodeMaterial } from 'three/webgpu';
import { texture, instanceIndex, vec2 } from 'three/tsl';
import { varyFoliage } from '@osia/atmosphere';
import { forestTrees, TREE_CONE_BASE_RADIUS } from '@osia/shared';
import { OSIA_COLORS } from '@osia/ui';
import { prefersReducedMotion } from './motionPrefs';
import { tintBySeason, currentSeasonTints } from './seasonScene';

/**
 * Scene — contenido de la primera escena de OSIA (S0.2).
 *
 * Geometría low-poly (suelo + pinos de conos apilados) e iluminación celestial
 * (luna fría + luz champán cálida + hemisférica). Sin assets externos todavía:
 * son primitivas con flatShading para el look low-poly intencional.
 */

type Tree = { position: [number, number, number]; scale: number; dL: number; dC: number; dH: number };

/** Recolorea las copas solo si el follaje de la estación cambió algo PERCEPTIBLE (no por frame). */
const FOLIAGE_REBAKE_EPS = 0.0015;

/** Meceo de viento de los pinos (constantes nombradas, §1.2; se congela con reduced-motion). */
const WIND = {
  swayAmp: 0.0165, // amplitud del mecido principal
  swaySecondaryAmp: 0.012, // segundo eje (movimiento orgánico)
  freqPrimary: 1.1,
  freqSecondary: 0.85,
  secondaryPhase: 1.2,
  phaseStep: 1.3, // desfase de fase por árbol → bosque "vivo", no sincronizado
};

/**
 * Forest — los pinos como InstancedMesh (S0.2 · instancing).
 *
 * Cada pino son 4 partes (tronco + 3 conos). En vez de 14×4 = 56 meshes sueltos,
 * agrupamos por geometría en 4 InstancedMesh (4 draw calls). El offset vertical de
 * cada parte se hornea en su geometría (.translate), así una sola transformación
 * por-árbol (posición + escala) sirve a todas sus partes. El COLOR de la copa va
 * por-instancia en una DataTexture (vía node material TSL, porque en WebGPU el
 * instanceColor clásico no funcionaba): el color por árbol = follaje de la estación
 * desplazado en OKLCH con el offset sembrado del árbol; el tronco es uniforme.
 */
function Forest({ trees }: { trees: Tree[] }) {
  const { meshes, tintTex, tintData } = useMemo(() => {
    // Color de cada copa = varyFoliage(follaje de la ESTACIÓN, offset OKLCH del árbol). Va en una
    // DataTexture (1 fila × N px, lineal) que el shader muestrea por `instanceIndex` → variación por
    // instancia GARANTIZADA. Se hornea aquí (init) y se re-hornea al cambiar la estación (useFrame).
    const parts = [
      { geo: new THREE.CylinderGeometry(0.12, 0.16, 1, 6).translate(0, 0.5, 0), tinted: false, roughness: 0.9, color: 0x2a211a },
      { geo: new THREE.ConeGeometry(TREE_CONE_BASE_RADIUS, 1.1, 7).translate(0, 1.1, 0), tinted: true, roughness: 0.85 },
      { geo: new THREE.ConeGeometry(0.68, 1.1, 7).translate(0, 1.8, 0), tinted: true, roughness: 0.85 },
      { geo: new THREE.ConeGeometry(0.46, 1.1, 7).translate(0, 2.5, 0), tinted: true, roughness: 0.85 },
    ];

    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const p = new THREE.Vector3();
    const s = new THREE.Vector3();

    // 1 px (RGBA float, lineal) por árbol; el contenido lo llena el horneado por estación (useFrame).
    const W = trees.length;
    const tintData = new Float32Array(W * 4);
    for (let i = 0; i < W; i++) tintData[i * 4 + 3] = 1; // alpha
    const tintTex = new THREE.DataTexture(tintData, W, 1, THREE.RGBAFormat, THREE.FloatType);
    tintTex.magFilter = THREE.NearestFilter; // un píxel exacto por árbol (sin interpolar entre vecinos)
    tintTex.minFilter = THREE.NearestFilter;

    const built = parts.map((part) => {
      let mat: THREE.Material;
      if (part.tinted) {
        const nodeMat = new MeshStandardNodeMaterial({ flatShading: true, roughness: part.roughness });
        // muestrea el píxel i (centro) de la textura: el color ya trae estación + variación por árbol
        const u = instanceIndex.toFloat().add(0.5).div(W);
        nodeMat.colorNode = texture(tintTex, vec2(u, 0.5)).rgb;
        mat = nodeMat;
      } else {
        mat = new THREE.MeshStandardMaterial({ color: part.color, flatShading: true, roughness: part.roughness });
      }
      const inst = new THREE.InstancedMesh(part.geo, mat, trees.length);
      inst.castShadow = true;
      trees.forEach((t, i) => {
        p.set(t.position[0], t.position[1], t.position[2]);
        s.setScalar(t.scale);
        inst.setMatrixAt(i, m.compose(p, q, s));
      });
      inst.instanceMatrix.needsUpdate = true;
      return inst;
    });
    return { meshes: built, tintTex, tintData };
  }, [trees]);

  // Viento: cada árbol se MECE (lean desde la base) con su propia fase → bosque vivo.
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tintScratch = useMemo(() => new THREE.Color(), []); // sRGB→lineal sin asignar por frame
  const lastFoliage = useRef<[number, number, number]>([-1, -1, -1]); // fuerza el primer horneado
  const tRef = useRef(0);
  useFrame((_, delta) => {
    // Estación → recolorea las copas, pero SOLO cuando el follaje cambió algo perceptible (no por
    // frame: el motor de estaciones avanza continuo y lentísimo → evitamos rebake/asignaciones por
    // frame, §7). Es color, no movimiento: se aplica aunque haya reduced-motion. varyFoliage corre
    // ~una vez cada varios minutos de juego (o al saltar de estación en el panel de test).
    const f = currentSeasonTints().foliage;
    const lf = lastFoliage.current;
    if (
      Math.abs(f[0] - lf[0]) > FOLIAGE_REBAKE_EPS ||
      Math.abs(f[1] - lf[1]) > FOLIAGE_REBAKE_EPS ||
      Math.abs(f[2] - lf[2]) > FOLIAGE_REBAKE_EPS
    ) {
      lf[0] = f[0];
      lf[1] = f[1];
      lf[2] = f[2];
      for (let i = 0; i < trees.length; i++) {
        const t = trees[i]!;
        const c = varyFoliage(f, t.dL, t.dC, t.dH); // sRGB 0..1, "en familia" con la estación
        tintScratch.setRGB(c[0], c[1], c[2], THREE.SRGBColorSpace); // → lineal (lo que espera el material)
        tintData[i * 4] = tintScratch.r;
        tintData[i * 4 + 1] = tintScratch.g;
        tintData[i * 4 + 2] = tintScratch.b;
      }
      tintTex.needsUpdate = true;
    }

    if (prefersReducedMotion()) return; // §9: sin loop de viento; los pinos quedan quietos
    tRef.current += delta;
    const t = tRef.current;
    for (let i = 0; i < trees.length; i++) {
      const tree = trees[i]!;
      const phase = i * WIND.phaseStep;
      dummy.position.set(tree.position[0], tree.position[1], tree.position[2]);
      dummy.rotation.set(
        Math.sin(t * WIND.freqPrimary + phase) * WIND.swayAmp, // mecido principal
        0,
        Math.sin(t * WIND.freqSecondary + phase + WIND.secondaryPhase) * WIND.swaySecondaryAmp, // segundo eje
      );
      dummy.scale.setScalar(tree.scale);
      dummy.updateMatrix();
      for (const inst of meshes) inst.setMatrixAt(i, dummy.matrix);
    }
    for (const inst of meshes) inst.instanceMatrix.needsUpdate = true;
  });

  // Los <primitive> no se auto-disponen: liberamos geo/material al desmontar.
  useEffect(
    () => () => {
      meshes.forEach((inst) => {
        inst.geometry.dispose();
        (inst.material as THREE.Material).dispose();
        inst.dispose();
      });
      tintTex.dispose();
    },
    [meshes, tintTex],
  );

  return (
    <>
      {meshes.map((inst, i) => (
        <primitive key={i} object={inst} />
      ))}
    </>
  );
}

/** Suelo low-poly — su color natural lo tiñe la ESTACIÓN (verde fresco → ocre → frío…). */
function Ground() {
  const matRef = useRef<THREE.MeshStandardMaterial>(null);
  const base = useMemo(() => new THREE.Color('#1d2a24'), []); // color natural, sin estación
  useFrame(() => {
    if (matRef.current) tintBySeason(matRef.current, base, 'ground');
  });
  // CON fog (como todo): en despejado no se nota (la niebla arranca lejos), pero en niebla/arena
  // el suelo se funde igual que árboles y cielo, sin "costura" en el horizonte.
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <circleGeometry args={[26, 48]} />
      <meshStandardMaterial ref={matRef} color="#1d2a24" flatShading roughness={1} />
    </mesh>
  );
}

export function Scene() {
  // Bosquecillo determinista (sin Math.random): anillo de pinos alrededor del claro.
  const trees = useMemo<Tree[]>(
    // Bosque desde la FUENTE ÚNICA compartida (@osia/shared/layout): misma posición/escala que el
    // server usa para spawnear despejado. El render solo lleva el offset de color por árbol (dL/dC/dH,
    // perceptual en OKLCH) que desplaza el follaje de la estación → bosque natural, igual para todos.
    () =>
      forestTrees().map((t) => ({
        position: [t.x, 0, t.z] as [number, number, number],
        scale: t.scale,
        dL: t.dL,
        dC: t.dC,
        dH: t.dH,
      })),
    [],
  );

  return (
    <>
      {/* Las luces (sol/luna/ambiente) las provee y anima <Atmosphere>. */}

      <Ground />

      {/* Un monolito celeste en el centro del claro (punto focal) */}
      <mesh position={[0, 1.5, 0]} castShadow>
        <icosahedronGeometry args={[1, 0]} />
        <meshStandardMaterial
          color={OSIA_COLORS.champan}
          flatShading
          metalness={0.3}
          roughness={0.4}
          emissive={OSIA_COLORS.champan}
          emissiveIntensity={0.08}
        />
      </mesh>

      <Forest trees={trees} />
    </>
  );
}
