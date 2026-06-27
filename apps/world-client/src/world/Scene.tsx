'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { OSIA_COLORS } from '@osia/ui';
import { prefersReducedMotion } from './motionPrefs';
import { tintBySeason } from './seasonScene';

/**
 * Scene — contenido de la primera escena de OSIA (S0.2).
 *
 * Geometría low-poly (suelo + pinos de conos apilados) e iluminación celestial
 * (luna fría + luz champán cálida + hemisférica). Sin assets externos todavía:
 * son primitivas con flatShading para el look low-poly intencional.
 */

type Tree = { position: [number, number, number]; scale: number; tint: THREE.Color };

/** Meceo de viento de los pinos (constantes nombradas, §1.2; se congela con reduced-motion). */
const WIND = {
  swayAmp: 0.0165, // amplitud del mecido principal
  swaySecondaryAmp: 0.012, // segundo eje (movimiento orgánico)
  freqPrimary: 1.1,
  freqSecondary: 0.85,
  secondaryPhase: 1.2,
  phaseStep: 1.3, // desfase de fase por árbol → bosque "vivo", no sincronizado
};

/** Bosquecillo: anillo de pinos alrededor del claro. */
const FOREST = {
  count: 14,
  ringRadiusBase: 7,
  ringRadiusStep: 1.8, // r = base + (i % 3) * step
  scaleBase: 0.8,
  scaleStep: 0.25, // scale = base + (i % 4) * step
  tintCycle: 5, // tinte = lerp(taupe→deep, (i % cycle) / cycle)
};

/**
 * Forest — los pinos como InstancedMesh (S0.2 · instancing).
 *
 * Cada pino son 4 partes (tronco + 3 conos). En vez de 14×4 = 56 meshes sueltos,
 * agrupamos por geometría en 4 InstancedMesh (4 draw calls). El offset vertical de
 * cada parte se hornea en su geometría (.translate), así una sola transformación
 * por-árbol (posición + escala) sirve a todas sus partes. El tinte de la copa va
 * por-instancia (instanceColor); el tronco es uniforme.
 */
function Forest({ trees }: { trees: Tree[] }) {
  const { meshes, foliageMats } = useMemo(() => {
    const parts = [
      { geo: new THREE.CylinderGeometry(0.12, 0.16, 1, 6).translate(0, 0.5, 0), tinted: false, roughness: 0.9, color: 0x2a211a },
      { geo: new THREE.ConeGeometry(0.9, 1.1, 7).translate(0, 1.1, 0), tinted: true, roughness: 0.85 },
      { geo: new THREE.ConeGeometry(0.68, 1.1, 7).translate(0, 1.8, 0), tinted: true, roughness: 0.85 },
      { geo: new THREE.ConeGeometry(0.46, 1.1, 7).translate(0, 2.5, 0), tinted: true, roughness: 0.85 },
    ];

    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const p = new THREE.Vector3();
    const s = new THREE.Vector3();

    const built = parts.map((part) => {
      const mat = new THREE.MeshStandardMaterial({
        color: part.tinted ? 0xffffff : part.color, // tinted: blanco base × instanceColor
        flatShading: true,
        roughness: part.roughness,
      });
      const inst = new THREE.InstancedMesh(part.geo, mat, trees.length);
      inst.castShadow = true;
      trees.forEach((t, i) => {
        p.set(t.position[0], t.position[1], t.position[2]);
        s.setScalar(t.scale);
        inst.setMatrixAt(i, m.compose(p, q, s));
        if (part.tinted) inst.setColorAt(i, t.tint);
      });
      inst.instanceMatrix.needsUpdate = true;
      if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
      return inst;
    });
    // Materiales de la COPA (foliage): la estación los tiñe. El tronco (no tinted) no.
    const foliageMats = built
      .map((inst, i) => (parts[i]!.tinted ? (inst.material as THREE.MeshStandardMaterial) : null))
      .filter((mat): mat is THREE.MeshStandardMaterial => mat !== null);
    return { meshes: built, foliageMats };
  }, [trees]);

  // Base de la copa = blanco (el instanceColor lleva la variación por árbol); la estación la
  // empuja hacia su color de foliage. Pre-alocado (no se asigna por frame).
  const foliageBase = useMemo(() => new THREE.Color(0xffffff), []);

  // Viento: cada árbol se MECE (lean desde la base) con su propia fase → bosque vivo.
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tRef = useRef(0);
  useFrame((_, delta) => {
    // Tinte estacional de la vegetación: SIEMPRE (es color, no movimiento; no se congela con
    // reduced-motion). Una llamada por material de copa → futura vegetación reusa lo mismo.
    for (const mat of foliageMats) tintBySeason(mat, foliageBase, 'foliage');

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
    },
    [meshes],
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
  const trees = useMemo(() => {
    const base = new THREE.Color(OSIA_COLORS.taupe);
    const deep = new THREE.Color('#2f3a30');
    return Array.from({ length: FOREST.count }, (_, i) => {
      const a = (i / FOREST.count) * Math.PI * 2;
      const r = FOREST.ringRadiusBase + (i % 3) * FOREST.ringRadiusStep;
      const tint = base.clone().lerp(deep, (i % FOREST.tintCycle) / FOREST.tintCycle);
      return {
        position: [Math.cos(a) * r, 0, Math.sin(a) * r] as [number, number, number],
        scale: FOREST.scaleBase + (i % 4) * FOREST.scaleStep,
        tint,
      };
    });
  }, []);

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
