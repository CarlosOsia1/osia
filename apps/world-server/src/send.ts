/** Helpers de envío binario a clientes (separados del transporte y los handlers). */

import { WebSocket } from 'ws';
import { encode, type S2CMessage } from '@osia/shared';
import type { Conn } from './state';

export function send(ws: WebSocket, msg: S2CMessage): void {
  if (ws.readyState === WebSocket.OPEN) ws.send(encode(msg));
}

export function broadcastAll(conns: Set<Conn>, msg: S2CMessage): void {
  const data = encode(msg);
  for (const c of conns) {
    if (c.entityId !== null && c.ws.readyState === WebSocket.OPEN) c.ws.send(data);
  }
}

export function broadcastExcept(conns: Set<Conn>, except: Conn, msg: S2CMessage): void {
  const data = encode(msg);
  for (const c of conns) {
    if (c !== except && c.entityId !== null && c.ws.readyState === WebSocket.OPEN) c.ws.send(data);
  }
}
