/**
 * Constantes compartidas del mundo y la red (S0.4-H1).
 * Cliente y servidor DEBEN usar estas mismas para que la simulación coincida.
 */

export const PROTOCOL_VERSION = 6; // +6: VOICE_SIGNAL/VOICE_STATE (voz P2P S0.6)

/** Simulación autoritativa: tick fijo. */
export const TICK_HZ = 20;
export const TICK_MS = 1000 / TICK_HZ; // 50 ms
export const MAX_CATCHUP_TICKS = 5; // límite de catch-up del acumulador

/** Frecuencia de envío de estado (puede bajar bajo presión). */
export const SEND_HZ = 20;

/** Movimiento a pie (debe coincidir con el cliente). */
export const MOVE_SPEED = 4.4; // m/s
export const GROUND_RADIUS = 23.5; // límite del claro de Fase 0

/** Instancias. */
export const INSTANCE_CAPACITY = 12; // techo del hub en Fase 0

/** Salud de conexión. */
export const PING_INTERVAL_MS = 2000;
export const CONNECTION_TIMEOUT_MS = 10000;
