import * as THREE from 'three';

/**
 * Animación PROCEDURAL del avatar (Ola 2 M3) — sin rig ni assets: el peso de la locomoción (M1)
 * se traduce a lenguaje corporal con matemática pura por frame. 100% cliente, cero red.
 *
 * Una sola implementación para el jugador local y los remotos (SRP §1.1): el caller entrega la
 * velocidad y el heading objetivo; aquí se resuelven giro con damping (adiós snap), bob de paso
 * ligado a la DISTANCIA recorrida (los pies no patinan), lean hacia la aceleración, manto que
 * ondea y arrastra, chispa que orbita, y respiración en reposo. Cero asignaciones por frame (§7):
 * el estado vive en un objeto mutable por avatar.
 */

export const AVATAR_MOTION = {
  /** Damping exponencial del giro del cuerpo (rad/s de "persecución"). */
  turnLambda: 11,
  /** Fase de paso por metro recorrido (cadencia ligada a la distancia, no al tiempo). */
  stepPerMeter: 2.4,
  /** Bob vertical del cuerpo a velocidad máxima (m). */
  bobAmp: 0.05,
  /** Balanceo lateral del manto por paso (rad). */
  swayAmp: 0.035,
  /** Lean del cuerpo por aceleración (rad por m/s² — suavizado). */
  leanPerAccel: 0.016,
  /** Lean base hacia adelante al correr a tope (rad). */
  runLean: 0.07,
  /** Tope absoluto del lean (rad). */
  leanMax: 0.2,
  /** Suavizado del lean y de la velocidad percibida (lambda exponencial). */
  smoothLambda: 9,
  /** El manto arrastra: inclinación extra contraria al avance (rad a velocidad máxima). */
  cloakTrail: 0.16,
  /** Ondeo del manto en reposo/movimiento (rad). */
  cloakWave: 0.03,
  /** Órbita de la chispa: radio (m) y velocidad angular quieto→corriendo (rad/s).
   *  CALMADA a pedido de Carlos (M5): órbita lenta, plana y pequeña — presencia, no mosca. */
  sparkRadius: 0.16,
  sparkSpeedIdle: 0.5,
  sparkSpeedRun: 1.2,
  /** Respiración en reposo (m, Hz suaves). */
  breathAmp: 0.012,
  breathFreq: 1.4,
  /** Altura base de la chispa (== AvatarMesh) y del centro del ondeo. */
  sparkBaseY: 2.16,
} as const;

/** Partes del avatar que la animación mueve. El caller las llena al montar (refs de AvatarMesh). */
export type AvatarParts = {
  /** Grupo EXTERIOR (posición en el mundo + heading). Lo posiciona el caller; aquí solo gira. */
  outer: THREE.Group | null;
  /** Grupo interior (bob + lean, en espacio local del cuerpo). */
  body: THREE.Group | null;
  cloak: THREE.Mesh | null;
  spark: THREE.Mesh | null;
};

/** Estado mutable por avatar (una instancia por Player/RemoteAvatar; sin alloc por frame). */
export type AvatarMotionState = {
  heading: number;
  phase: number;
  speedSmooth: number;
  accelSmooth: number;
  prevSpeed: number;
  sparkAngle: number;
  t: number;
};

export function createAvatarMotionState(heading = 0): AvatarMotionState {
  return { heading, phase: 0, speedSmooth: 0, accelSmooth: 0, prevSpeed: 0, sparkAngle: 0, t: 0 };
}

/** Envuelve un ángulo a (-π, π] — arco corto para el damping del giro. */
function wrapPI(a: number): number {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

/**
 * Avanza la animación un frame. `vx/vz` = velocidad actual (de la reconciliación local o derivada
 * de la interpolación remota); `targetHeading` = hacia dónde debería mirar el cuerpo (null = mantener).
 * Con `reduced` (prefers-reduced-motion §9) se conservan giro suave y postura, pero se apagan los
 * LOOPS (bob, ondeo, órbita, respiración): sin oscilación continua.
 */
export function stepAvatarMotion(
  st: AvatarMotionState,
  parts: AvatarParts,
  vx: number,
  vz: number,
  targetHeading: number | null,
  dt: number,
  reduced: boolean,
): void {
  const { outer, body, cloak, spark } = parts;
  if (!outer || !body || dt <= 0) return;
  const M = AVATAR_MOTION;
  st.t += dt;

  const speed = Math.sqrt(vx * vx + vz * vz);
  const k = 1 - Math.exp(-M.smoothLambda * dt);
  st.speedSmooth += (speed - st.speedSmooth) * k;
  // Aceleración escalar percibida (con signo: acelera + / frena −), suavizada.
  const rawAccel = (speed - st.prevSpeed) / dt;
  st.prevSpeed = speed;
  st.accelSmooth += (rawAccel - st.accelSmooth) * k;

  const speedNorm = Math.min(1, st.speedSmooth / 4.4); // 0..1 sobre MOVE_SPEED

  // --- giro del cuerpo con damping (adiós snap): persigue el heading por el arco corto ---
  if (targetHeading !== null) {
    st.heading += wrapPI(targetHeading - st.heading) * (1 - Math.exp(-M.turnLambda * dt));
    st.heading = wrapPI(st.heading);
  }
  outer.rotation.y = st.heading;

  // --- postura: lean hacia la aceleración + lean de carrera (siempre, también con reduced) ---
  const lean = THREE.MathUtils.clamp(
    st.accelSmooth * M.leanPerAccel + speedNorm * M.runLean,
    -M.leanMax,
    M.leanMax,
  );

  if (reduced) {
    body.rotation.x = lean;
    body.rotation.z = 0;
    body.position.y = 0;
    if (cloak) {
      cloak.rotation.x = speedNorm * M.cloakTrail;
      cloak.rotation.z = 0;
    }
    if (spark) spark.position.set(0, M.sparkBaseY, 0); // quieta en su sitio (sin órbita)
    return;
  }

  // --- bob de paso: la fase avanza con la DISTANCIA recorrida (cadencia honesta) ---
  st.phase += st.speedSmooth * M.stepPerMeter * dt;
  const bob = Math.abs(Math.sin(st.phase)) * M.bobAmp * speedNorm;
  // Respiración solo en reposo (se desvanece al arrancar).
  const breath = Math.sin(st.t * Math.PI * 2 * M.breathFreq) * M.breathAmp * (1 - speedNorm);
  body.position.y = bob + breath;
  body.rotation.x = lean;
  body.rotation.z = Math.sin(st.phase) * M.swayAmp * speedNorm;

  // --- manto: arrastra contra el avance y ondea suave ---
  if (cloak) {
    cloak.rotation.x = speedNorm * M.cloakTrail + Math.sin(st.t * 1.7) * M.cloakWave * (0.4 + speedNorm);
    cloak.rotation.z = Math.sin(st.t * 1.3 + 0.8) * M.cloakWave * 0.6;
  }

  // --- chispa: órbita PLANA y serena alrededor de la cabeza (sin bamboleo vertical, M5) ---
  if (spark) {
    st.sparkAngle += dt * (M.sparkSpeedIdle + (M.sparkSpeedRun - M.sparkSpeedIdle) * speedNorm);
    if (st.sparkAngle > Math.PI * 2) st.sparkAngle -= Math.PI * 2;
    spark.position.set(
      Math.cos(st.sparkAngle) * M.sparkRadius,
      M.sparkBaseY,
      Math.sin(st.sparkAngle) * M.sparkRadius,
    );
  }
}
