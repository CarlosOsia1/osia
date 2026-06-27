'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { MeshStandardNodeMaterial } from 'three/webgpu';
import { texture, instanceIndex, vec2, uniform } from 'three/tsl';
import { clamp01 } from '@osia/atmosphere';
import { forestTrees } from '@osia/shared';
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

/**
 * Forest — los pinos como InstancedMesh (S0.2 · instancing).
 *
 * Cada pino son 4 partes (tronco + 3 conos). En vez de 14×4 = 56 meshes sueltos,
 * agrupamos por geometría en 4 InstancedMesh (4 draw calls). El offset vertical de
 * cada parte se hornea en su geometría (.translate), así una sola transformación
 * por-árbol (posición + escala) sirve a todas sus partes. El tinte de la copa va
 * por-instancia (atributo instanciado × uniform de estación, vía node material TSL,
 * porque en WebGPU el instanceColor clásico no se multiplica); el tronco es uniforme.
 */
function Forest({ trees }: { trees: Tree[] }) {
  const { meshes, seasonU, tintTex } = useMemo(() => {
    // Color de cada copa = tinte POR ÁRBOL × uniform de la ESTACIÓN. El tinte por árbol va en una
    // DataTexture (1 fila × N px) que el shader muestrea por `instanceIndex` → variación por
    // instancia GARANTIZADA (los atributos instanciados clásicos no funcionaban en WebGPU aquí).
    const seasonU = uniform(new THREE.Vector3(1, 1, 1));
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

    // Tinte por árbol en una textura de datos (RGBA float, sin conversión de espacio), 1 px por árbol.
    const W = trees.length;
    const tintData = new Float32Array(W * 4);
    trees.forEach((t, i) => {
      tintData[i * 4] = t.tint.r;
      tintData[i * 4 + 1] = t.tint.g;
      tintData[i * 4 + 2] = t.tint.b;
      tintData[i * 4 + 3] = 1;
    });
    const tintTex = new THREE.DataTexture(tintData, W, 1, THREE.RGBAFormat, THREE.FloatType);
    tintTex.magFilter = THREE.NearestFilter; // un píxel exacto por árbol (sin interpolar entre vecinos)
    tintTex.minFilter = THREE.NearestFilter;
    tintTex.needsUpdate = true;

    const built = parts.map((part) => {
      let mat: THREE.Material;
      if (part.tinted) {
        const nodeMat = new MeshStandardNodeMaterial({ flatShading: true, roughness: part.roughness });
        // muestrea el píxel i (centro) de la textura de tintes y lo multiplica por la estación
        const u = instanceIndex.toFloat().add(0.5).div(W);
        nodeMat.colorNode = texture(tintTex, vec2(u, 0.5)).rgb.mul(seasonU);
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
    return { meshes: built, seasonU, tintTex };
  }, [trees]);

  // Viento: cada árbol se MECE (lean desde la base) con su propia fase → bosque vivo.
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const seasonScratch = useMemo(() => new THREE.Color(), []); // sRGB→lineal sin asignar por frame
  const tRef = useRef(0);
  useFrame((_, delta) => {
    // Estación → uniform del color de la copa. SIEMPRE (es color, no movimiento: no se congela con
    // reduced-motion). Cache por frame compartido con el resto de la escena (currentSeasonTints).
    const f = currentSeasonTints().foliage;
    seasonScratch.setRGB(f[0], f[1], f[2], THREE.SRGBColorSpace);
    seasonU.value.set(seasonScratch.r, seasonScratch.g, seasonScratch.b);

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
    // server usa para spawnear despejado. El render solo arma el color (brillo + matiz cálido/frío
    // por árbol, que multiplica al color de la estación) → bosque natural, igual para todos.
    () =>
      forestTrees().map((t) => ({
        position: [t.x, 0, t.z] as [number, number, number],
        scale: t.scale,
        tint: new THREE.Color(clamp01(t.bright + t.warm), clamp01(t.bright), clamp01(t.bright - t.warm)),
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
