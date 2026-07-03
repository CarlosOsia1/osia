'use client';

import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useKeyboardControls } from '@react-three/drei';
import * as THREE from 'three';
import { applyMovement, MAX_INPUT_DT_S, WORLD_OBSTACLES } from '@osia/shared';
import { getNetClient } from '../net/useNet';
import { isChatTyping } from '../net/store';
import { terrainHeight } from './terrain';
import { prefersReducedMotion } from './motionPrefs';
import { createAvatarMotionState, stepAvatarMotion, type AvatarParts } from './avatarMotion';
import { occludedCameraDistance } from './cameraOcclusion';
import { setCameraRay } from './cameraRay';
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
const CAM_RECOVER_LAMBDA = 5; // la cámara ocluida se ACERCA al instante y se re-aleja suave (M4)
const MIN_CAM_DIST = 1.2; // piso: nunca pegada al cuello (near plane lejos del avatar)
/**
 * Techo de INPUTs por segundo (M4): a ≤60 fps se envía 1 por frame (igual que siempre); en
 * monitores de 120/144 Hz los frames se COALESCEN (dt acumulado + último f/r/yaw) → mismo tiempo
 * simulado con la mitad de paquetes. El tramo aún no enviado se predice como preview local.
 */
const INPUT_SEND_HZ = 60;
const SEND_INTERVAL_S = 1 / INPUT_SEND_HZ;

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
  // Estado cinemático reconciliado (server + replay). Con locomoción con peso (M1) el replay parte
  // de la MISMA posición Y velocidad autoritativas; en modo local, la velocidad persiste entre frames.
  const recon = useRef({ x: 0, z: 0, vx: 0, vz: 0 }).current;
  // Animación procedural (M3): partes del cuerpo + estado de la marcha (sin alloc por frame).
  const parts = useRef<AvatarParts>({ outer: null, body: null, cloak: null, spark: null });
  const motion = useRef(createAvatarMotionState()).current;
  // Input a tasa fija (M4): dt acumulado aún no enviado + preview local de ese tramo.
  const sendAccum = useRef(0);
  const preview = useRef({ x: 0, z: 0, vx: 0, vz: 0 }).current;
  const inputScratch = useRef({ f: 0, r: 0, yaw: 0 }).current; // §7: sin literales por frame
  // Cámara con oclusión (M4): rayo mirada→cámara y distancia suavizada.
  const camRay = useRef(new THREE.Vector3()).current;
  const camDist = useRef(CAM_DIST);

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

    // Heading objetivo del cuerpo: hacia donde se mueve (el giro con damping lo aplica M3 abajo).
    let targetHeading: number | null = null;
    if (moving) {
      move.set(0, 0, 0).addScaledVector(fwd, f).addScaledVector(right, r).normalize();
      targetHeading = Math.atan2(move.x, move.z);
    }

    // --- INPUT a tasa fija COALESCIDA (M4) → NetClient lo guarda en `pending` ---
    // (también parado, para reportar f=0). El server lo encola y lo drena por tick. El acumulado
    // se capa a MAX_INPUT_DT_S: lo enviado y lo previsto usan EXACTAMENTE el mismo dt.
    sendAccum.current = Math.min(sendAccum.current + dt, MAX_INPUT_DT_S);
    if (sendAccum.current >= SEND_INTERVAL_S - 1e-6) {
      net.sendInput(f, r, yaw.current, sendAccum.current);
      sendAccum.current = 0;
    }

    // --- posición = estado AUTORITATIVO + REPLAY de los inputs pendientes (Gambetta/Valve) ---
    // El server procesa EXACTAMENTE los mismos inputs (misma applyMovement determinista), así la
    // posición mostrada es la predicción correcta anclada al server: cero rubber-band, sin lag.
    const ss = net.serverSelf;
    if (ss) {
      recon.x = ss.x;
      recon.z = ss.z;
      recon.vx = ss.vx;
      recon.vz = ss.vz;
      for (const inp of net.pending) applyMovement(recon, inp, inp.dt, WORLD_OBSTACLES);
      // Preview del tramo coalescido AÚN no enviado (M4): continuidad exacta — al enviarse, ese
      // mismo dt entra a `pending` y el preview se vuelve replay. Render de 120/144 Hz suave.
      preview.x = recon.x;
      preview.z = recon.z;
      preview.vx = recon.vx;
      preview.vz = recon.vz;
      if (sendAccum.current > 0) {
        inputScratch.f = f;
        inputScratch.r = r;
        inputScratch.yaw = yaw.current;
        applyMovement(preview, inputScratch, sendAccum.current, WORLD_OBSTACLES);
      }
      g.position.x = preview.x;
      g.position.z = preview.z;
    } else {
      // Sin servidor todavía: dead-reckoning local por frame (misma función pura). Corre TAMBIÉN
      // sin input: con peso, al soltar las teclas hay que seguir frenando (la velocidad persiste
      // en `recon` entre frames; quieto y sin inercia, applyMovement es un no-op barato).
      recon.x = g.position.x;
      recon.z = g.position.z;
      inputScratch.f = f;
      inputScratch.r = r;
      inputScratch.yaw = yaw.current;
      applyMovement(recon, inputScratch, dt, WORLD_OBSTACLES);
      g.position.x = recon.x;
      g.position.z = recon.z;
      preview.vx = recon.vx;
      preview.vz = recon.vz;
    }
    // Posado sobre el relieve (M2): la simulación es 2D; la altura solo viste la escena.
    g.position.y = terrainHeight(g.position.x, g.position.z);

    // Animación procedural (M3): giro con damping, bob de paso, lean, manto y chispa — desde la
    // velocidad del estado que se RENDERIZA (reconciliación + preview), no desde el input crudo.
    stepAvatarMotion(motion, parts.current, preview.vx, preview.vz, targetHeading, delta, prefersReducedMotion());

    // --- cámara de tercera persona (pivote suavizado + oclusión M4) ---
    pivot.lerp(g.position, 1 - Math.exp(-FOLLOW_LAMBDA * delta));
    const horiz = Math.cos(elev.current) * CAM_DIST;
    offset.set(
      Math.sin(yaw.current) * horiz,
      Math.sin(elev.current) * CAM_DIST + 1.0,
      Math.cos(yaw.current) * horiz,
    );
    lookAt.copy(pivot);
    lookAt.y += 1.2;
    // Rayo mirada→cámara deseada: si un árbol/monolito/loma se interpone, la cámara se ACERCA
    // (al instante, para no clipear) y se re-aleja con suavizado cuando el paso queda libre.
    camRay.copy(pivot).add(offset).sub(lookAt);
    // Invariante: con ELEV_MAX < π/2 el rayo nunca es ~0; el max() lo blinda si alguien lo sube.
    const rayLen = Math.max(camRay.length(), 1e-6);
    camRay.multiplyScalar(1 / rayLen);
    const allowed = Math.max(
      MIN_CAM_DIST,
      occludedCameraDistance(lookAt.x, lookAt.y, lookAt.z, camRay.x, camRay.y, camRay.z, rayLen),
    );
    camDist.current =
      allowed < camDist.current
        ? allowed
        : Math.min(rayLen, camDist.current + (allowed - camDist.current) * (1 - Math.exp(-CAM_RECOVER_LAMBDA * delta)));
    camera.position.copy(lookAt).addScaledVector(camRay, camDist.current);
    camera.lookAt(lookAt);
    // Publica el rayo del frame: Forest/Monolith se DESVANECEN si se interponen (M5, cameraRay.ts).
    setCameraRay(lookAt.x, lookAt.y, lookAt.z, camRay.x, camRay.y, camRay.z, camDist.current);
  });

  return (
    <group
      ref={(g) => {
        group.current = g;
        parts.current.outer = g;
      }}
      position={[0, 0, 6]}
    >
      <AvatarMesh partsRef={parts} />
    </group>
  );
}
