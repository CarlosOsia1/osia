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
 * directa (sin Rapier todavía: el suelo de F0 es plano; Rapier entra en S0.5).
 *
 * Cámara de tercera persona con MOUSE-LOOK ESTÁNDAR (pointer lock): clic en el
 * mundo captura el puntero y mover el mouse gira la cámara (sin arrastrar); ESC lo
 * suelta. Eje vertical NO invertido. Corre a priority 0 (antes de AtmosphereFX).
 */

export type Controls = 'forward' | 'back' | 'left' | 'right';

const SPEED = 4.4; // m/s
const CAM_DIST = 7.5;
const SENS = 0.0022; // rad por píxel de mouse
const ELEV_MIN = 0.12; // ~7° sobre el horizonte
const ELEV_MAX = 1.3; // ~74° (casi cenital)
const FOLLOW_LAMBDA = 14; // suavizado del pivote (mayor = más pegado al avatar)
const GROUND_RADIUS = 23.5; // el suelo es un disco r=26; dejamos margen

export default function Player() {
  const group = useRef<THREE.Group>(null);
  const camera = useThree((s) => s.camera);
  const dom = useThree((s) => s.gl.domElement);
  const [, getKeys] = useKeyboardControls<Controls>();

  const yaw = useRef(0); // azimut de la cámara alrededor del avatar
  const elev = useRef(0.42); // elevación sobre el horizonte

  // temporales reutilizables (cero asignaciones por frame)
  const fwd = useRef(new THREE.Vector3()).current;
  const right = useRef(new THREE.Vector3()).current;
  const move = useRef(new THREE.Vector3()).current;
  const pivot = useRef(new THREE.Vector3(0, 0, 6)).current; // punto que la cámara orbita/observa
  const offset = useRef(new THREE.Vector3()).current;
  const lookAt = useRef(new THREE.Vector3()).current;

  // Mouse-look estándar con pointer lock (clic captura, ESC suelta).
  useEffect(() => {
    const requestLock = () => {
      if (document.pointerLockElement !== dom) void dom.requestPointerLock();
    };
    const onMove = (e: MouseEvent) => {
      if (document.pointerLockElement !== dom) return; // solo cuando está capturado
      yaw.current -= e.movementX * SENS; // mouse derecha → girar a la derecha
      elev.current = THREE.MathUtils.clamp(elev.current + e.movementY * SENS, ELEV_MIN, ELEV_MAX);
    };
    dom.addEventListener('click', requestLock);
    document.addEventListener('mousemove', onMove);
    return () => {
      dom.removeEventListener('click', requestLock);
      document.removeEventListener('mousemove', onMove);
    };
  }, [dom]);

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

    // Cámara de tercera persona: el pivote sigue al avatar con damping (translación
    // suave) y la cámara orbita SIEMPRE a radio fijo desde el pivote. Computar la
    // posición desde los ángulos (no interpolar la posición) evita que un giro
    // brusco "corte la cuerda" del círculo y acerque la cámara al avatar.
    pivot.lerp(g.position, 1 - Math.exp(-FOLLOW_LAMBDA * delta));

    const horiz = Math.cos(elev.current) * CAM_DIST;
    offset.set(
      Math.sin(yaw.current) * horiz,
      Math.sin(elev.current) * CAM_DIST + 1.0,
      Math.cos(yaw.current) * horiz,
    );
    camera.position.copy(pivot).add(offset);
    lookAt.copy(pivot);
    lookAt.y += 1.2;
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
