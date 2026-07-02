/**
 * Mensajes del protocolo. Tipados al opcode para que cliente y servidor compartan
 * exactamente la misma forma. Se serializan en BINARIO (ver codec.ts).
 */

import { C2S, S2C } from './opcodes';
import type { WireErrorCodeValue } from './opcodes';
import type { WeatherState } from '@osia/atmosphere';
import type { EntityId } from '../domain/ids';
import type { EntityState, DeltaEntity } from './entities';
import type { VoiceSignalKind } from './voiceState';

export type { EntityState, DeltaEntity };

/** Estado de atmósfera autoritativo del mundo: bioma + clima (WeatherState es el tipo canónico). */
export type AtmosphereState = { biome: string; weather: WeatherState };

// ---- Cliente → Servidor ----
export type HelloMsg = { op: typeof C2S.HELLO; ticket: string; protocol: number; resumeToken?: string };
export type InputMsg = { op: typeof C2S.INPUT; seq: number; f: number; r: number; yaw: number; dtMs: number };
export type PingMsg = { op: typeof C2S.PING; t: number };
export type ChatSendMsg = { op: typeof C2S.CHAT_SEND; text: string };
export type ByeMsg = { op: typeof C2S.BYE };
/** Voz P2P: el cliente tuneliza SDP/ICE hacia otro par (dstId); el server reescribe a S2C. */
export type VoiceSignalMsg = { op: typeof C2S.VOICE_SIGNAL; dstId: EntityId; kind: VoiceSignalKind; payload: string };
/** Estado de voz propio (bits: 1=mic 2=hablando 4=sordo) anunciado al roster. */
export type VoiceStateMsg = { op: typeof C2S.VOICE_STATE; flags: number };

export type C2SMessage = HelloMsg | InputMsg | PingMsg | ChatSendMsg | ByeMsg | VoiceSignalMsg | VoiceStateMsg;

// ---- Servidor → Cliente ----
export type WelcomeMsg = {
  op: typeof S2C.WELCOME;
  selfId: EntityId;
  instanceId: string;
  protocol: number;
  tickHz: number;
  entities: EntityState[];
  atmosphere: AtmosphereState; // estado de clima/bioma actual (sync inmediato al entrar)
  serverTime: number; // hora del server (ms) → sincroniza el ciclo día/noche entre clientes
  resumeToken: string; // para re-adoptar esta entidad si hay una reconexión (grace window)
};
/** El server dicta el clima (autoritativo); todos los clientes lo sincronizan. */
export type AtmosphereUpdateMsg = { op: typeof S2C.ATMOSPHERE_UPDATE; biome: string; weather: WeatherState };
export type DeltaMsg = { op: typeof S2C.DELTA; tick: number; ackSeq: number; entities: DeltaEntity[] };
export type EntityJoinMsg = { op: typeof S2C.ENTITY_JOIN; entity: EntityState };
export type EntityLeaveMsg = { op: typeof S2C.ENTITY_LEAVE; id: EntityId };
export type PongMsg = { op: typeof S2C.PONG; t: number; serverTime: number };
export type ChatBroadcastMsg = { op: typeof S2C.CHAT_MSG; id: EntityId; handle: string; text: string };
/** Voz P2P relayada: SDP/ICE de srcId (inyectado por el server, anti-spoof). */
export type VoiceSignalRelayMsg = { op: typeof S2C.VOICE_SIGNAL; srcId: EntityId; kind: VoiceSignalKind; payload: string };
/** Estado de voz de otro par (id) difundido al roster. */
export type VoiceStateRelayMsg = { op: typeof S2C.VOICE_STATE; id: EntityId; flags: number };
export type ErrorMsg = { op: typeof S2C.ERROR; code: WireErrorCodeValue; message: string };

export type S2CMessage =
  | WelcomeMsg
  | DeltaMsg
  | EntityJoinMsg
  | EntityLeaveMsg
  | PongMsg
  | ChatBroadcastMsg
  | AtmosphereUpdateMsg
  | VoiceSignalRelayMsg
  | VoiceStateRelayMsg
  | ErrorMsg;

export type NetMessage = C2SMessage | S2CMessage;
