'use client';

import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useKeyboardControls } from '@react-three/drei';
import * as THREE from 'three';
import { applyMovement, MAX_INPUT_DT_S } from '@osia/shared';
import { getNetClient } from '../net/useNet';
import { isChatTyping } from '../net/store';
import AvatarMesh from './AvatarMesh';

/**
 * Player — el avatar local de OSIA (S0.3 + S0.5).
 *
 * Movimiento A PIE relativo a la cámara (WASD/flechas), mouse-look estándar
 * (pointer lock). En red (S0.5): predicción LOCAL inmediata + envío de INPUT (intención
 * f/r/yaw, nunca posiciones) UNA VEZ POR FRAME de render + reconciliación suave con el
 * estado autoritativo del servidor (snap solo ante desync grande). El dt se clampa a
 * MAX_INPUT_DT_S antes de predecir Y de enviar (misma cota que el server) para que un
 * tab-switch/stutter no diverja entre predicción y autoridad. Usa MOVE_SPEED/GROUND_RADIUS
 * de @osia/shared: la MISMA simulación que el server → casi sin error.
 */

export type Controls = 'forward' | 'back' | 'left' | 'right';

const CAM_DIST = 7.5;
const SENS = 0.0022; // rad por píxel de mouse
const ELEV_MIN = -0.12; // permite bajar la cámara bajo la horizontal (mirar más hacia arriba)
const ELEV_MAX = 1.3;
const FOLLOW_LAMBDA = 14; // suavizado del pivote de cámara

export default function Player() {
  const group = useRef<THREE.Group>(null);
  const camera = useThree((s) => s.camera);
  const dom = useThree((s) => s.gl.domElement);
  const [, getKeys] = useKeyboardControls<Controls>();
  const net = useRef(getNetClient()).current;

  const yaw = useRef(0);
  const elev = useRef(0.42);

  const fwd = useRef(new THREE.Vector3()).current;
  const right = useRef(new THREE.Vector3()).current;
  const move = useRef(new THREE.Vector3()).current;
  const pivot = useRef(new THREE.Vector3(0, 0, 6)).current;
  const offset = useRef(new THREE.Vector3()).current;
  const lookAt = useRef(new THREE.Vector3()).current;
  const recon = useRef({ x: 0, z: 0 }).current; // posición reconciliada (server + replay)

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
    // Mientras se escribe en el chat, las teclas van al input: no mover ni rotar.
    const typing = isChatTyping();
    const f = typing ? 0 : (k.forward ? 1 : 0) - (k.back ? 1 : 0);
    const r = typing ? 0 : (k.right ? 1 : 0) - (k.left ? 1 : 0);
    const moving = f !== 0 || r !== 0;
    // Clamp del dt a la MISMA cota que aplica el server (MAX_INPUT_DT_S): tras un tab-switch o
    // stutter, R3F entrega un delta grande; sin clamp, la predicción local avanzaría más que la
    // autoridad (que sí recorta) → snap visible al reconciliar. Clampado, ambos coinciden.
    const dt = Math.min(delta, MAX_INPUT_DT_S);

    // Orientación del cuerpo: mira hacia donde se mueve (visual; no se reconcilia).
    if (moving) {
      move.set(0, 0, 0).addScaledVector(fwd, f).addScaledVector(right, r).normalize();
      g.rotation.y = Math.atan2(move.x, move.z);
    }

    // --- enviar 1 INPUT POR FRAME (con su dt clampado) → NetClient lo guarda en `pending` ---
    // (también parado, para reportar f=0). El server lo encola y lo drena por tick.
    net.sendInput(f, r, yaw.current, dt);

    // --- posición = estado AUTORITATIVO + REPLAY de los inputs pendientes (Gambetta/Valve) ---
    // Como envío 1 input por frame, `recon` avanza un paso de frame por frame → suave; y el
    // server procesa EXACTAMENTE los mismos inputs (misma applyMovement determinista), así la
    // posición mostrada es la predicción correcta anclada al server: cero rubber-band, sin lag.
    const ss = net.serverSelf;
    if (ss) {
      recon.x = ss.x;
      recon.z = ss.z;
      for (const inp of net.pending) applyMovement(recon, inp, inp.dt);
      g.position.x = recon.x;
      g.position.z = recon.z;
    } else if (moving) {
      // sin servidor todavía: dead-reckoning local por frame (misma función pura).
      recon.x = g.position.x;
      recon.z = g.position.z;
      applyMovement(recon, { f, r, yaw: yaw.current }, dt);
      g.position.x = recon.x;
      g.position.z = recon.z;
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
