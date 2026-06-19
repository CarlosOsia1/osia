'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import { OSIA_COLORS } from '@osia/ui';

/**
 * Scene — contenido de la primera escena de OSIA (S0.2).
 *
 * Geometría low-poly (suelo + pinos de conos apilados) e iluminación celestial
 * (luna fría + luz champán cálida + hemisférica). Sin assets externos todavía:
 * son primitivas con flatShading para el look low-poly intencional.
 */

type TreeProps = { position: [number, number, number]; scale: number; tint: THREE.Color };

function Pino({ position, scale, tint }: TreeProps) {
  return (
    <group position={position} scale={scale} castShadow>
      {/* tronco */}
      <mesh position={[0, 0.5, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.16, 1, 6]} />
        <meshStandardMaterial color="#2a211a" flatShading roughness={0.9} />
      </mesh>
      {/* copa: tres conos apilados */}
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[0, 1.1 + i * 0.7, 0]} castShadow>
          <coneGeometry args={[0.9 - i * 0.22, 1.1, 7]} />
          <meshStandardMaterial color={tint} flatShading roughness={0.85} />
        </mesh>
      ))}
    </group>
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
      {/* Luz ambiental marfil tenue */}
      <ambientLight intensity={0.35} color={OSIA_COLORS.marfil} />
      {/* Hemisférica: cielo frío arriba, rebote champán abajo */}
      <hemisphereLight args={['#3a4a66', OSIA_COLORS.champan, 0.5]} />
      {/* "Sol" del crepúsculo: direccional champán cálida que proyecta sombras */}
      <directionalLight
        position={[12, 10, 6]}
        intensity={2.4}
        color={OSIA_COLORS.champan}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />

      {/* Suelo low-poly */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[26, 48]} />
        <meshStandardMaterial color="#1d2a24" flatShading roughness={1} />
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

      {trees.map((t, i) => (
        <Pino key={i} position={t.position} scale={t.scale} tint={t.tint} />
      ))}
    </>
  );
}
