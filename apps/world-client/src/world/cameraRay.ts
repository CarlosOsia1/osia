/**
 * Rayo mirada→cámara del frame (Ola 2 M5) — canal SIN React entre el Player (que lo escribe tras
 * resolver la cámara) y los sistemas de OCLUSIÓN VISUAL (Forest/Monolith se desvanecen cuando se
 * interponen). Patrón de los singletons del cliente (worldClockRuntime, isChatTyping): estado
 * mutable de módulo, cero re-render, cero asignaciones.
 */

export const cameraRay = {
  ox: 0,
  oy: 0,
  oz: 0,
  dx: 0,
  dy: 0,
  dz: 1,
  len: 0,
  active: false,
};

export function setCameraRay(
  ox: number,
  oy: number,
  oz: number,
  dx: number,
  dy: number,
  dz: number,
  len: number,
): void {
  cameraRay.ox = ox;
  cameraRay.oy = oy;
  cameraRay.oz = oz;
  cameraRay.dx = dx;
  cameraRay.dy = dy;
  cameraRay.dz = dz;
  cameraRay.len = len;
  cameraRay.active = true;
}

/**
 * Un obstáculo pegado al AVATAR no debe desvanecerse (Carlos: «el árbol al lado del jugador NO»):
 * solo se desvanece lo que se interpone EN MEDIO de la línea de visión. Si la intersección empieza
 * a menos de este tramo del avatar, es un vecino rozando el rayo, no un oclusor.
 */
const NEAR_EXCLUDE_M = 0.9;

/**
 * ¿El rayo de cámara del frame cruza el cilindro (cx, cz, r) por debajo de `top`, EN MEDIO de la
 * línea avatar→cámara? Intersección rayo-círculo en XZ + corte de altura + guardas de extremo.
 * Es la prueba que decide QUÉ se desvanece (la cámara ya no se acerca por árboles — patrón fade
 * de la industria).
 */
export function cameraRayHitsCylinder(cx: number, cz: number, r: number, top: number): boolean {
  if (!cameraRay.active) return false;
  const { ox, oy, oz, dx, dy, dz, len } = cameraRay;
  const a = dx * dx + dz * dz;
  if (a < 1e-9) return false; // rayo vertical: no cruza cilindros laterales
  const mx = ox - cx;
  const mz = oz - cz;
  const half = mx * dx + mz * dz;
  const c = mx * mx + mz * mz - r * r;
  // El AVATAR está dentro del círculo (caminando entre las hojas de ESE árbol): no es un oclusor
  // de en-medio — se ve raro que fantasmee el árbol que estás tocando.
  if (c <= 0) return false;
  const disc = half * half - a * c;
  if (disc <= 0) return false;
  const sq = Math.sqrt(disc);
  const t0 = (-half - sq) / a;
  const t1 = (-half + sq) / a;
  if (t1 <= 0 || t0 >= len) return false; // detrás del origen o más allá de la cámara
  if (t0 < NEAR_EXCLUDE_M) return false; // nace pegado al avatar: vecino de al lado, no oclusor
  return oy + dy * t0 <= top; // por encima de la copa no ocluye
}
