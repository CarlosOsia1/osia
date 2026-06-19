/**
 * Opcodes del protocolo de red de OSIA (S0.4-H1).
 * Fuente única de verdad cliente↔servidor. Espejo de docs/05 y docs/10.
 * C2S = cliente→servidor (0x0X) · S2C = servidor→cliente (0x8X).
 */

export const C2S = {
  HELLO: 0x01,
  INPUT: 0x02,
  ACK: 0x03,
  PING: 0x04,
  CHAT_SEND: 0x05,
  PORTAL_ENTER: 0x06,
  INTERACT: 0x07,
  VOICE_SIGNAL: 0x08,
  BYE: 0x09,
} as const;

export const S2C = {
  WELCOME: 0x81,
  SNAPSHOT: 0x82,
  DELTA: 0x83,
  ENTITY_JOIN: 0x84,
  ENTITY_LEAVE: 0x85,
  PONG: 0x86,
  CHAT_MSG: 0x87,
  ATMOSPHERE_UPDATE: 0x88,
  ATMOSPHERE_EVENT: 0x89,
  VOICE_SIGNAL: 0x8b,
  PRESENCE: 0x8c,
  ERROR: 0x8e,
} as const;

export type C2SOpcode = (typeof C2S)[keyof typeof C2S];
export type S2COpcode = (typeof S2C)[keyof typeof S2C];

/** Códigos de error en mensajes ERROR (0x8E). */
export const ErrorCode = {
  BAD_TICKET: 1,
  PROTOCOL_MISMATCH: 2,
  INSTANCE_FULL: 3,
  RATE_LIMIT: 4,
  BAD_MESSAGE: 5,
  TIMEOUT: 6,
} as const;

export type ErrorCodeValue = (typeof ErrorCode)[keyof typeof ErrorCode];
