'use client';

import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { OSIA_COLORS } from '@osia/ui';

/**
 * Scene — contenido de la primera escena de OSIA (S0.2).
 *
 * Geometría low-poly (suelo + pinos de conos apilados) e iluminación celestial
 * (luna fría + luz champán cálida + hemisférica). Sin assets externos todavía:
 * son primitivas con flatShading para el look low-poly intencional.
 */

type Tree = { position: [number, number, number]; scale: number; tint: THREE.Color };

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
  const meshes = useMemo(() => {
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

    return parts.map((part) => {
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
  }, [trees]);

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

export function Scene() {
  // Bosquecillo determinista (sin Math.random): anillo de pinos alrededor del claro.
  const trees = useMemo(() => {
    const base = new THREE.Color(OSIA_COLORS.taupe);
    const deep = new THREE.Color('#2f3a30');
    return Array.from({ length: 14 }, (_, i) => {
      const a = (i / 14) * Math.PI * 2;
      const r = 7 + (i % 3) * 1.8;
      const tint = base.clone().lerp(deep, (i % 5) / 5);
      return {
        position: [Math.cos(a) * r, 0, Math.sin(a) * r] as [number, number, number],
        scale: 0.8 + (i % 4) * 0.25,
        tint,
      };
    });
  }, []);

  return (
    <>
      {/* Las luces (sol/luna/ambiente) las provee y anima <Atmosphere>. */}

      {/* Suelo low-poly — fog=false: sin el degradado de niebla por distancia en el piso. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[26, 48]} />
        <meshStandardMaterial color="#1d2a24" flatShading roughness={1} fog={false} />
      </mesh>

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
