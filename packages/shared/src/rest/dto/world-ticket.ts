/** Respuesta de `POST /v1/world/tickets` (docs/10 §2.1): el ticket firmado + a dónde conectarse. */
export type WorldTicketDto = {
  /** JWT HS256 de un solo uso (~60s) que el cliente presenta en el HELLO del WS. */
  ticket: string;
  /** Segundos de vida del ticket. */
  expiresIn: number;
  /** URL del WebSocket del world-server. */
  wsUrl: string;
};
