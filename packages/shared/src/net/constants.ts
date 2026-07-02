/**
 * Constantes compartidas del mundo y la red (S0.4-H1).
 * Cliente y servidor DEBEN usar estas mismas para que la simulación coincida.
 */

export const PROTOCOL_VERSION = 6; // +6: VOICE_SIGNAL/VOICE_STATE (voz P2P S0.6)

/**
 * Versión del CONTRATO de atmósfera (clima/bioma difundido por el server), INDEPENDIENTE de
 * PROTOCOL_VERSION para poder iterar el clima sin re-versionar todo el protocolo (S2-B3).
 * Changelog:
 *   v1: { biome, weather: { kind, intensity } }. La ESTACIÓN (S2-B1) se deriva del reloj en
 *       cliente y servidor (determinista, como timeOfDay) → NO viaja en el cable, así que no
 *       la versiona. Si algún día un campo del clima viaja por red, súbela y deja la nota.
 */
export const ATMOSPHERE_CONTRACT_VERSION = 1;

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
/**
 * Presupuesto de tiempo SIMULADO por tick y entidad (anti speed-hack, patrón Source
 * `sv_maxusrcmdprocessticks` / Overwatch). `step()` aplica movimiento mientras Σdt ≤ este techo;
 * el excedente igual actualiza yaw/ackSeq pero NO desplaza. Un cliente honesto (dt real ≈ TICK_MS
 * por tick) nunca lo alcanza; un flood de inputs con dt inflado queda acotado a ~2 ticks de avance.
 */
export const MAX_SIM_DT_PER_TICK_S = (TICK_MS / 1000) * 2; // 0.1 s con TICK_MS=50

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

/** Id del mundo compartido por defecto (Fase 0/1). Contrato cliente↔servidor (no repetir el literal). */
export const DEFAULT_WORLD_ID = 'osia';

/**
 * Claves de sessionStorage (POR PESTAÑA) que el cliente del mundo usa para re-adoptar su entidad
 * tras un reload (resume token) y conservar su handle anónimo. Centralizadas para que cualquier
 * módulo (debug, tests) use las mismas, no literales sueltos.
 */
export const RESUME_TOKEN_STORAGE_KEY = 'osia.resumeToken';
export const HANDLE_STORAGE_KEY = 'osia.handle';

/**
 * World ticket (JWT HS256 efímero, docs/05 §2.1). Contrato CRUZADO: lo FIRMA apps/api y lo
 * VERIFICA world-server, así que estos valores DEBEN vivir una sola vez (si se desincronizan,
 * los tickets se rechazan en silencio).
 */
export const WORLD_TICKET_TTL_S = 60;
export const WORLD_TICKET_TTL_MS = WORLD_TICKET_TTL_S * 1000;
/** Secreto de DEV — fallback compartido entre emisor y verificador. En prod va por env. */
export const DEV_WORLD_TICKET_SECRET = 'osia-dev-ticket-secret-change-me';
/** Longitud mínima del secreto en producción (anti fuerza bruta del HS256). */
export const WORLD_TICKET_MIN_SECRET_LEN = 32;

/** Claims firmados en el world ticket. */
export type WorldTicketClaims = {
  handle: string;
  worldId: string;
  /** Cuenta del residente (Fase 1; ausente en el self-issue anónimo de Fase 0). */
  accountId?: string;
  /** Acento del pasaporte (S1.8-H2): viaja en el ticket para que el world-server lo difunda sin DB. */
  accentColor?: string;
};
