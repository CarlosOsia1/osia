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

/** Anti-cheat / anti-flood de inputs (server-authoritative). */
export const MAX_QUEUED_INPUTS = 120; // techo de la cola de inputs por entidad (descarta flood)
export const MAX_INPUT_DT_S = 0.1; // dt máximo admitido por input (100 ms) — clampa teleport por dt inflado

/** Instancias. */
export const INSTANCE_CAPACITY = 12; // techo del hub en Fase 0

/** AOI (interest management, docs/05 §5.3): entra a 40 m, sale a 45 m (histéresis). */
export const AOI_ENTER_M = 40;
export const AOI_EXIT_M = 45;
/** Presupuesto de red objetivo por jugador/tick (docs/05 §5.4). */
export const AOI_BUDGET_BYTES = 1500;

/** Salud de conexión (alineado a docs/05 §2.2: ping 5s, timeout 15s, gracia 30s). */
export const PING_INTERVAL_MS = 5000; // heartbeat WS: cada cuánto se hace ping
export const CONNECTION_TIMEOUT_MS = 15000; // sin señal del cliente por este tiempo → terminar (3 pings)
export const HELLO_TIMEOUT_MS = 5000; // un socket sin HELLO válido en este plazo se cierra (anti recurso/auth)
export const RECONNECT_GRACE_MS = 30000; // la entidad se conserva tras una caída para permitir resume

/** Tope de tamaño del payload de signaling de voz (SDP/ICE) — anti amplificación/DoS. */
export const MAX_VOICE_PAYLOAD_BYTES = 16384;
