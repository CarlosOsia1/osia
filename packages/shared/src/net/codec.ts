/**
 * Codec del protocolo (S0.7) — BINARIO. Una sola puerta de (de)serialización: el resto
 * del código solo usa encode()/decode() y no sabe del formato del cable.
 *
 * Formato: 1 byte de opcode + campos empacados (DataView, big-endian). Strings con
 * prefijo u16 de longitud + UTF-8. Floats en f64 (round-trip EXACTO → la predicción del
 * cliente y la del server coinciden sin drift). Mucho más chico/rápido que JSON.
 */

import { C2S, S2C } from './opcodes';
import type { NetMessage, C2SMessage, S2CMessage } from './messages';

const te = new TextEncoder();
const td = new TextDecoder();

class Writer {
  private buf = new Uint8Array(128);
  private view = new DataView(this.buf.buffer);
  private off = 0;
  private ensure(n: number): void {
    if (this.off + n <= this.buf.byteLength) return;
    let cap = this.buf.byteLength * 2;
    while (cap < this.off + n) cap *= 2;
    const next = new Uint8Array(cap);
    next.set(this.buf);
    this.buf = next;
    this.view = new DataView(this.buf.buffer);
  }
  u8(v: number): void {
    this.ensure(1);
    this.view.setUint8(this.off, v);
    this.off += 1;
  }
  u16(v: number): void {
    this.ensure(2);
    this.view.setUint16(this.off, v);
    this.off += 2;
  }
  u32(v: number): void {
    this.ensure(4);
    this.view.setUint32(this.off, v >>> 0);
    this.off += 4;
  }
  i8(v: number): void {
    this.ensure(1);
    this.view.setInt8(this.off, v);
    this.off += 1;
  }
  f64(v: number): void {
    this.ensure(8);
    this.view.setFloat64(this.off, v);
    this.off += 8;
  }
  str(s: string): void {
    const bytes = te.encode(s);
    this.u16(bytes.length);
    this.ensure(bytes.length);
    this.buf.set(bytes, this.off);
    this.off += bytes.length;
  }
  out(): Uint8Array {
    return this.buf.subarray(0, this.off);
  }
}

class Reader {
  private bytes: Uint8Array;
  private view: DataView;
  private off = 0;
  constructor(data: ArrayBuffer | Uint8Array) {
    this.bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
    this.view = new DataView(this.bytes.buffer, this.bytes.byteOffset, this.bytes.byteLength);
  }
  u8(): number {
    const v = this.view.getUint8(this.off);
    this.off += 1;
    return v;
  }
  u16(): number {
    const v = this.view.getUint16(this.off);
    this.off += 2;
    return v;
  }
  u32(): number {
    const v = this.view.getUint32(this.off);
    this.off += 4;
    return v;
  }
  i8(): number {
    const v = this.view.getInt8(this.off);
    this.off += 1;
    return v;
  }
  f64(): number {
    const v = this.view.getFloat64(this.off);
    this.off += 8;
    return v;
  }
  str(): string {
    const n = this.u16();
    const s = td.decode(this.bytes.subarray(this.off, this.off + n));
    this.off += n;
    return s;
  }
}

/** Serializa un mensaje a binario (Uint8Array). */
export function encode(msg: NetMessage): Uint8Array {
  const w = new Writer();
  w.u8(msg.op);
  switch (msg.op) {
    // ---- C2S ----
    case C2S.HELLO:
      w.str(msg.ticket);
      w.u8(msg.protocol);
      w.str(msg.resumeToken ?? '');
      break;
    case C2S.INPUT:
      w.u32(msg.seq);
      w.i8(msg.f);
      w.i8(msg.r);
      w.f64(msg.yaw);
      w.f64(msg.dtMs);
      break;
    case C2S.PING:
      w.f64(msg.t);
      break;
    case C2S.CHAT_SEND:
      w.str(msg.text);
      break;
    case C2S.BYE:
      break;
    case C2S.VOICE_SIGNAL:
      w.u32(msg.dstId);
      w.u8(msg.kind);
      w.str(msg.payload);
      break;
    case C2S.VOICE_STATE:
      w.u8(msg.flags);
      break;
    // ---- S2C ----
    case S2C.WELCOME:
      w.u32(msg.selfId);
      w.str(msg.instanceId);
      w.u8(msg.protocol);
      w.u8(msg.tickHz);
      w.u16(msg.entities.length);
      for (const e of msg.entities) {
        w.u32(e.id);
        w.str(e.handle);
        w.f64(e.x);
        w.f64(e.z);
        w.f64(e.yaw);
      }
      w.str(msg.atmosphere.biome);
      w.str(msg.atmosphere.weather.kind);
      w.f64(msg.atmosphere.weather.intensity);
      w.f64(msg.serverTime);
      w.str(msg.resumeToken);
      break;
    case S2C.DELTA:
      w.u32(msg.tick);
      w.u32(msg.ackSeq);
      w.u16(msg.entities.length);
      for (const e of msg.entities) {
        w.u32(e.id);
        w.f64(e.x);
        w.f64(e.z);
        w.f64(e.yaw);
      }
      break;
    case S2C.ENTITY_JOIN:
      w.u32(msg.entity.id);
      w.str(msg.entity.handle);
      w.f64(msg.entity.x);
      w.f64(msg.entity.z);
      w.f64(msg.entity.yaw);
      break;
    case S2C.ENTITY_LEAVE:
      w.u32(msg.id);
      break;
    case S2C.PONG:
      w.f64(msg.t);
      w.f64(msg.serverTime);
      break;
    case S2C.CHAT_MSG:
      w.u32(msg.id);
      w.str(msg.handle);
      w.str(msg.text);
      break;
    case S2C.ATMOSPHERE_UPDATE:
      w.str(msg.biome);
      w.str(msg.weather.kind);
      w.f64(msg.weather.intensity);
      break;
    case S2C.VOICE_SIGNAL:
      w.u32(msg.srcId);
      w.u8(msg.kind);
      w.str(msg.payload);
      break;
    case S2C.VOICE_STATE:
      w.u32(msg.id);
      w.u8(msg.flags);
      break;
    case S2C.ERROR:
      w.u8(msg.code);
      w.str(msg.message);
      break;
    default:
      break; // SNAPSHOT u opcodes no usados (no se envían)
  }
  return w.out();
}

/** Deserializa binario; devuelve null si el mensaje no es válido. */
export function decode<T extends NetMessage = NetMessage>(data: ArrayBuffer | Uint8Array): T | null {
  try {
    const rd = new Reader(data);
    const op = rd.u8();
    switch (op) {
      // ---- C2S ----
      case C2S.HELLO: {
        const ticket = rd.str();
        const protocol = rd.u8();
        const resumeToken = rd.str();
        return { op, ticket, protocol, ...(resumeToken ? { resumeToken } : {}) } as T;
      }
      case C2S.INPUT:
        return { op, seq: rd.u32(), f: rd.i8(), r: rd.i8(), yaw: rd.f64(), dtMs: rd.f64() } as T;
      case C2S.PING:
        return { op, t: rd.f64() } as T;
      case C2S.CHAT_SEND:
        return { op, text: rd.str() } as T;
      case C2S.BYE:
        return { op } as T;
      case C2S.VOICE_SIGNAL:
        return { op, dstId: rd.u32(), kind: rd.u8(), payload: rd.str() } as T;
      case C2S.VOICE_STATE:
        return { op, flags: rd.u8() } as T;
      // ---- S2C ----
      case S2C.WELCOME: {
        const selfId = rd.u32();
        const instanceId = rd.str();
        const protocol = rd.u8();
        const tickHz = rd.u8();
        const n = rd.u16();
        const entities = [];
        for (let i = 0; i < n; i++) {
          entities.push({ id: rd.u32(), handle: rd.str(), x: rd.f64(), z: rd.f64(), yaw: rd.f64() });
        }
        const biome = rd.str();
        const kind = rd.str();
        const intensity = rd.f64();
        const serverTime = rd.f64();
        const resumeToken = rd.str();
        return {
          op,
          selfId,
          instanceId,
          protocol,
          tickHz,
          entities,
          atmosphere: { biome, weather: { kind, intensity } },
          serverTime,
          resumeToken,
        } as T;
      }
      case S2C.DELTA: {
        const tick = rd.u32();
        const ackSeq = rd.u32();
        const n = rd.u16();
        const entities = [];
        for (let i = 0; i < n; i++) entities.push({ id: rd.u32(), x: rd.f64(), z: rd.f64(), yaw: rd.f64() });
        return { op, tick, ackSeq, entities } as T;
      }
      case S2C.ENTITY_JOIN:
        return { op, entity: { id: rd.u32(), handle: rd.str(), x: rd.f64(), z: rd.f64(), yaw: rd.f64() } } as T;
      case S2C.ENTITY_LEAVE:
        return { op, id: rd.u32() } as T;
      case S2C.PONG:
        return { op, t: rd.f64(), serverTime: rd.f64() } as T;
      case S2C.CHAT_MSG:
        return { op, id: rd.u32(), handle: rd.str(), text: rd.str() } as T;
      case S2C.ATMOSPHERE_UPDATE:
        return { op, biome: rd.str(), weather: { kind: rd.str(), intensity: rd.f64() } } as T;
      case S2C.VOICE_SIGNAL:
        return { op, srcId: rd.u32(), kind: rd.u8(), payload: rd.str() } as T;
      case S2C.VOICE_STATE:
        return { op, id: rd.u32(), flags: rd.u8() } as T;
      case S2C.ERROR:
        return { op, code: rd.u8(), message: rd.str() } as T;
      default:
        return null;
    }
  } catch {
    return null;
  }
}

export type { NetMessage, C2SMessage, S2CMessage };
