'use client';

import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useKeyboardControls } from '@react-three/drei';
import * as THREE from 'three';
import { MOVE_SPEED, GROUND_RADIUS } from '@osia/shared';
import { getNetClient } from '../net/useNet';
import AvatarMesh from './AvatarMesh';

/**
 * Player — el avatar local de OSIA (S0.3 + S0.5).
 *
 * Movimiento A PIE relativo a la cámara (WASD/flechas), mouse-look estándar
 * (pointer lock). En red (S0.5): predicción LOCAL inmediata + envío de INPUT a
 * 20 Hz (intención f/r/yaw, nunca posiciones) + reconciliación suave con el estado
 * autoritativo del servidor (snap solo ante desync grande). Usa MOVE_SPEED y
 * GROUND_RADIUS de @osia/shared: la MISMA simulación que el server → casi sin error.
 */

export type Controls = 'forward' | 'back' | 'left' | 'right';

const CAM_DIST = 7.5;
const SENS = 0.0022; // rad por píxel de mouse
const ELEV_MIN = 0.12;
const ELEV_MAX = 1.3;
const FOLLOW_LAMBDA = 14; // suavizado del pivote de cámara
const SEND_INTERVAL = 0.05; // enviar INPUT cada 50 ms (20 Hz)
const RECON_SNAP_DIST2 = 4; // (2 m)^2 → snap; menos → corrección suave
const RECON_LAMBDA = 8;

export default function Player() {
  const group = useRef<THREE.Group>(null);
  const camera = useThree((s) => s.camera);
  const dom = useThree((s) => s.gl.domElement);
  const [, getKeys] = useKeyboardControls<Controls>();
  const net = useRef(getNetClient()).current;

  const yaw = useRef(0);
  const elev = useRef(0.42);
  const sendAcc = useRef(0);
  const synced = useRef(false);

  const fwd = useRef(new THREE.Vector3()).current;
  const right = useRef(new THREE.Vector3()).current;
  const move = useRef(new THREE.Vector3()).current;
  const pivot = useRef(new THREE.Vector3(0, 0, 6)).current;
  const offset = useRef(new THREE.Vector3()).current;
  const lookAt = useRef(new THREE.Vector3()).current;

  // Mouse-look estándar con pointer lock (clic captura, ESC suelta).
  useEffect(() => {
    const requestLock = () => {
      if (document.pointerLockElement === dom) return;
      // requestPointerLock rechaza con SecurityError si se llama justo tras salir
      // del lock (cooldown del navegador); lo ignoramos (funciona al siguiente clic).
      const req = dom.requestPointerLock() as unknown;
      if (req && typeof (req as { catch?: unknown }).catch === 'function') {
        (req as Promise<void>).catch(() => {});
      }
    };
    const onMove = (e: MouseEvent) => {
      if (document.pointerLockElement !== dom) return;
      yaw.current -= e.movementX * SENS;
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

    fwd.set(-Math.sin(yaw.current), 0, -Math.cos(yaw.current));
    right.set(-fwd.z, 0, fwd.x);
    const f = (k.forward ? 1 : 0) - (k.back ? 1 : 0);
    const r = (k.right ? 1 : 0) - (k.left ? 1 : 0);

    // --- predicción local (respuesta inmediata) ---
    if (f !== 0 || r !== 0) {
      move.set(0, 0, 0).addScaledVector(fwd, f).addScaledVector(right, r).normalize();
      g.position.addScaledVector(move, MOVE_SPEED * delta);
      const d = Math.hypot(g.position.x, g.position.z);
      if (d > GROUND_RADIUS) {
        g.position.x *= GROUND_RADIUS / d;
        g.position.z *= GROUND_RADIUS / d;
      }
      g.rotation.y = Math.atan2(move.x, move.z);
    }

    // --- enviar INPUT a 20 Hz (también parado, para reportar f=0) ---
    sendAcc.current += delta;
    if (sendAcc.current >= SEND_INTERVAL) {
      sendAcc.current = 0;
      net.sendInput(f, r, yaw.current);
    }

    // --- reconciliación con el estado autoritativo ---
    const ss = net.serverSelf;
    if (ss) {
      if (!synced.current) {
        g.position.x = ss.x;
        g.position.z = ss.z;
        synced.current = true;
      } else {
        const ex = ss.x - g.position.x;
        const ez = ss.z - g.position.z;
        if (ex * ex + ez * ez > RECON_SNAP_DIST2) {
          g.position.x = ss.x;
          g.position.z = ss.z;
        } else {
          const a = 1 - Math.exp(-RECON_LAMBDA * delta);
          g.position.x += ex * a;
          g.position.z += ez * a;
        }
      }
    }

    // --- cámara de tercera persona (radio constante; pivote suavizado) ---
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
      <AvatarMesh />
    </group>
  );
}
