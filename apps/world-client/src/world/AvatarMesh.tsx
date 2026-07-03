'use client';

import type { MutableRefObject } from 'react';
import type * as THREE from 'three';
import { OSIA_COLORS } from '@osia/ui';
import type { AvatarParts } from './avatarMotion';

/**
 * AvatarMesh — el cuerpo visual del avatar celestial (manto + cabeza + chispa).
 * Compartido por el jugador local (Player) y los remotos (RemotePlayers).
 * El color del manto distingue self (champán) de los demás (taupe).
 *
 * M3: el cuerpo vive en un grupo INTERIOR (bob/lean en espacio local, sin pelear con el heading
 * del grupo exterior) y expone sus partes vía `partsRef` para la animación procedural
 * (avatarMotion). Sigue siendo "tonto": no anima nada por sí mismo.
 */
export default function AvatarMesh({
  cloakColor = OSIA_COLORS.champan,
  partsRef,
}: {
  cloakColor?: string;
  partsRef?: MutableRefObject<AvatarParts>;
}) {
  return (
    <group
      ref={(g) => {
        if (partsRef) partsRef.current.body = g;
      }}
    >
      <mesh
        ref={(m: THREE.Mesh | null) => {
          if (partsRef) partsRef.current.cloak = m;
        }}
        position={[0, 0.7, 0]}
        castShadow
      >
        <coneGeometry args={[0.5, 1.4, 8]} />
        <meshStandardMaterial color={cloakColor} flatShading roughness={0.7} metalness={0.1} />
      </mesh>
      <mesh position={[0, 1.62, 0]} castShadow>
        <icosahedronGeometry args={[0.27, 1]} />
        <meshStandardMaterial color={OSIA_COLORS.marfil} flatShading roughness={0.6} />
      </mesh>
      <mesh
        ref={(m: THREE.Mesh | null) => {
          if (partsRef) partsRef.current.spark = m;
        }}
        position={[0, 2.16, 0]}
      >
        <octahedronGeometry args={[0.1, 0]} />
        <meshStandardMaterial
          color={OSIA_COLORS.champan}
          emissive={OSIA_COLORS.champan}
          emissiveIntensity={0.9}
          flatShading
        />
      </mesh>
    </group>
  );
}
