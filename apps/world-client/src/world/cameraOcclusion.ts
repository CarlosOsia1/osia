import { terrainHeight } from './terrain';

/**
 * Oclusión de cámara (Ola 2 M4/M5) — SOLO contra el TERRENO: la cámara nunca se hunde tras una
 * loma ni bajo el realce del borde. Los árboles y el monolito ya NO empujan la cámara (el zoom de
 * golpe se sentía horrible — feedback de Carlos): en su lugar se DESVANECEN cuando se interponen
 * (ver cameraRay.ts + los fades de Scene), el patrón estándar de la industria (Genshin/Zelda/
 * Fortnite: la cámara respeta sólidos grandes y el follaje se hace transparente).
 *
 * Determinista y sin asignaciones por llamada (§7).
 */

/** Altura mínima de la cámara sobre el terreno. */
const GROUND_CLEARANCE = 0.4;
/** Muestras del chequeo a lo largo del rayo (el relieve es suave: bastan pocas). */
const GROUND_STEPS = 6;

/**
 * Distancia MÁXIMA permitida de la cámara sobre el rayo `origen + t·dir` (dir unitario), acotada
 * por `maxDist`. `origen` es el punto que la cámara mira (cabeza del avatar); el rayo apunta
 * HACIA la posición deseada de la cámara.
 */
export function occludedCameraDistance(
  ox: number,
  oy: number,
  oz: number,
  dx: number,
  dy: number,
  dz: number,
  maxDist: number,
): number {
  let allowed = maxDist;
  for (let i = 1; i <= GROUND_STEPS; i++) {
    const t = (allowed * i) / GROUND_STEPS;
    const x = ox + dx * t;
    const y = oy + dy * t;
    const z = oz + dz * t;
    if (y < terrainHeight(x, z) + GROUND_CLEARANCE) {
      // retrocede a la muestra anterior (el relieve es suave; el margen absorbe el resto)
      allowed = (allowed * (i - 1)) / GROUND_STEPS;
      break;
    }
  }
  return allowed;
}
