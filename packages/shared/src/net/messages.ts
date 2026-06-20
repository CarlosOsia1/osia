/**
 * Mensajes del protocolo (S0.4-H1). Tipados al opcode para que cliente y servidor
 * compartan exactamente la misma forma. Por ahora se serializan como JSON (codec.ts);
 * el codec binario con cuantización llega en S0.8 (rendimiento) sin tocar estos tipos.
 */

import { C2S, S2C } from './opcodes';

/** Estado de una entidad (jugador) en el mundo. Fase 0: posición en el plano + yaw. */
export type EntityState = {
  id: number;
  handle: string;
  x: number;
  z: number;
  yaw: number;
};

/**
 * Clima que viaja por la red. `kind` es un WeatherKind de @osia/atmosphere, tipado
 * como string aquí para no acoplar la capa de red a la de atmósfera.
 */
export type WireWeather = { kind: string; intensity: number };
/** Estado de atmósfera autoritativo del mundo: bioma + clima. */
export type AtmosphereState = { biome: string; weather: WireWeather };

// ---- Cliente → Servidor ----
export type HelloMsg = { op: typeof C2S.HELLO; ticket: string; protocol: number };
export type InputMsg = { op: typeof C2S.INPUT; seq: number; f: number; r: number; yaw: number };
export type PingMsg = { op: typeof C2S.PING; t: number };
export type ChatSendMsg = { op: typeof C2S.CHAT_SEND; text: string };
export type ByeMsg = { op: typeof C2S.BYE };

export type C2SMessage = HelloMsg | InputMsg | PingMsg | ChatSendMsg | ByeMsg;

// ---- Servidor → Cliente ----
export type WelcomeMsg = {
  op: typeof S2C.WELCOME;
  selfId: number;
  instanceId: string;
  protocol: number;
  tickHz: number;
  entities: EntityState[];
  atmosphere: AtmosphereState; // estado de clima/bioma actual (sync inmediato al entrar)
};
/** El server dicta el clima (autoritativo); todos los clientes lo sincronizan. */
export type AtmosphereUpdateMsg = { op: typeof S2C.ATMOSPHERE_UPDATE; biome: string; weather: WireWeather };
export type SnapshotMsg = { op: typeof S2C.SNAPSHOT; tick: number; entities: EntityState[] };
export type DeltaMsg = { op: typeof S2C.DELTA; tick: number; ackSeq: number; entities: EntityState[] };
export type EntityJoinMsg = { op: typeof S2C.ENTITY_JOIN; entity: EntityState };
export type EntityLeaveMsg = { op: typeof S2C.ENTITY_LEAVE; id: number };
export type PongMsg = { op: typeof S2C.PONG; t: number };
export type ChatBroadcastMsg = { op: typeof S2C.CHAT_MSG; id: number; handle: string; text: string };
export type ErrorMsg = { op: typeof S2C.ERROR; code: number; message: string };

export type S2CMessage =
  | WelcomeMsg
  | SnapshotMsg
  | DeltaMsg
  | EntityJoinMsg
  | EntityLeaveMsg
  | PongMsg
  | ChatBroadcastMsg
  | AtmosphereUpdateMsg
  | ErrorMsg;

export type NetMessage = C2SMessage | S2CMessage;
