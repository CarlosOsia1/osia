'use client';

import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useKeyboardControls } from '@react-three/drei';
import * as THREE from 'three';
import { OSIA_COLORS } from '@osia/ui';

/**
 * Player — el avatar caminable de OSIA (S0.3 · "El Cuerpo").
 *
 * Figura low-poly celestial (manto cónico champán + cabeza marfil + chispa, eco
 * del símbolo). Movimiento A PIE relativo a la cámara (WASD/flechas) por cinemática
 * directa (sin Rapier todavía: el suelo de F0 es plano, no hay colisiones; Rapier
 * entra en S0.5). Cámara orbital de tercera persona con arrastre del puntero.
 *
 * Corre a priority por defecto (0): actualiza posición y cámara ANTES de que
 * AtmosphereFX (priority 1) pinte el frame.
 */

export type Controls = 'forward' | 'back' | 'left' | 'right';

const SPEED = 4.4; // m/s
const CAM_DIST = 7.5;
const GROUND_RADIUS = 23.5; // el suelo es un disco r=26; dejamos margen

export default function Player() {
  const group = useRef<THREE.Group>(null);
  const camera = useThree((s) => s.camera);
  const [, getKeys] = useKeyboardControls<Controls>();

  const yaw = useRef(0);
  const pitch = useRef(0.42);
  const dragging = useRef(false);

  // temporales reutilizables (cero asignaciones por frame)
  const fwd = useRef(new THREE.Vector3()).current;
  const right = useRef(new THREE.Vector3()).current;
  const move = useRef(new THREE.Vector3()).current;
  const camPos = useRef(new THREE.Vector3()).current;
  const lookAt = useRef(new THREE.Vector3()).current;

  // Órbita de cámara con arrastre del puntero (sin pointer-lock).
  useEffect(() => {
    const onDown = () => {
      dragging.current = true;
    };
    const onUp = () => {
      dragging.current = false;
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging.current) return;
      yaw.current -= e.movementX * 0.0035;
      pitch.current = THREE.MathUtils.clamp(pitch.current - e.movementY * 0.003, 0.12, 1.15);
    };
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointermove', onMove);
    return () => {
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointermove', onMove);
    };
  }, []);

  useFrame((_, delta) => {
    const g = group.current;
    if (!g) return;
    const k = getKeys();

    // "hacia adentro" (lejos de la cámara) y derecha, proyectados al suelo
    fwd.set(-Math.sin(yaw.current), 0, -Math.cos(yaw.current));
    right.set(-fwd.z, 0, fwd.x);

    const f = (k.forward ? 1 : 0) - (k.back ? 1 : 0);
    const r = (k.right ? 1 : 0) - (k.left ? 1 : 0);

    if (f !== 0 || r !== 0) {
      move.set(0, 0, 0).addScaledVector(fwd, f).addScaledVector(right, r).normalize();
      g.position.addScaledVector(move, SPEED * delta);

      // mantener al avatar dentro del claro
      const d = Math.hypot(g.position.x, g.position.z);
      if (d > GROUND_RADIUS) {
        g.position.x *= GROUND_RADIUS / d;
        g.position.z *= GROUND_RADIUS / d;
      }

      // mira hacia donde camina
      g.rotation.y = Math.atan2(move.x, move.z);
    }

    // cámara orbital de seguimiento (spherical alrededor del avatar)
    const horiz = Math.cos(pitch.current) * CAM_DIST;
    camPos.set(
      g.position.x + Math.sin(yaw.current) * horiz,
      g.position.y + Math.sin(pitch.current) * CAM_DIST + 0.6,
      g.position.z + Math.cos(yaw.current) * horiz,
    );
    camera.position.lerp(camPos, 1 - Math.pow(0.0008, delta));
    lookAt.set(g.position.x, g.position.y + 1.2, g.position.z);
    camera.lookAt(lookAt);
  });

  return (
    <group ref={group} position={[0, 0, 6]}>
      {/* manto cónico (cuerpo) */}
      <mesh position={[0, 0.7, 0]} castShadow>
        <coneGeometry args={[0.5, 1.4, 8]} />
        <meshStandardMaterial color={OSIA_COLORS.champan} flatShading roughness={0.7} metalness={0.1} />
      </mesh>
      {/* cabeza */}
      <mesh position={[0, 1.62, 0]} castShadow>
        <icosahedronGeometry args={[0.27, 1]} />
        <meshStandardMaterial color={OSIA_COLORS.marfil} flatShading roughness={0.6} />
      </mesh>
      {/* chispa celeste flotante (eco del símbolo OSIA) */}
      <mesh position={[0, 2.16, 0]}>
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
