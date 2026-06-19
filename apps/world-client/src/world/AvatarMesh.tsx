'use client';

import { OSIA_COLORS } from '@osia/ui';

/**
 * AvatarMesh — el cuerpo visual del avatar celestial (manto + cabeza + chispa).
 * Compartido por el jugador local (Player) y los remotos (RemotePlayers).
 * El color del manto distingue self (champán) de los demás (taupe).
 */
export default function AvatarMesh({ cloakColor = OSIA_COLORS.champan }: { cloakColor?: string }) {
  return (
    <>
      <mesh position={[0, 0.7, 0]} castShadow>
        <coneGeometry args={[0.5, 1.4, 8]} />
        <meshStandardMaterial color={cloakColor} flatShading roughness={0.7} metalness={0.1} />
      </mesh>
      <mesh position={[0, 1.62, 0]} castShadow>
        <icosahedronGeometry args={[0.27, 1]} />
        <meshStandardMaterial color={OSIA_COLORS.marfil} flatShading roughness={0.6} />
      </mesh>
      <mesh position={[0, 2.16, 0]}>
        <octahedronGeometry args={[0.1, 0]} />
        <meshStandardMaterial
          color={OSIA_COLORS.champan}
          emissive={OSIA_COLORS.champan}
          emissiveIntensity={0.9}
          flatShading
        />
      </mesh>
    </>
  );
}
