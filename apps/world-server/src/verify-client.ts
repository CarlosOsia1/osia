/**
 * Cliente de verificación del world-server (S0.4 DoD). No es un test unitario:
 * abre conexiones reales contra el server corriendo y comprueba el flujo completo.
 *   pnpm --filter @osia/world-server verify   (con el server escuchando)
 */

import { WebSocket } from 'ws';
import {
  encode,
  decode,
  C2S,
  S2C,
  PROTOCOL_VERSION,
  type S2CMessage,
  type DeltaEntity,
} from '@osia/shared';

const HTTP = process.env.WORLD_HTTP ?? 'http://localhost:2567';
const WS_URL = process.env.WORLD_WS ?? 'ws://localhost:2567/world';
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function getTicket(handle: string): Promise<string> {
  const res = await fetch(`${HTTP}/world/tickets`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ worldId: 'osia', handle }),
  });
  const json = (await res.json()) as { ticket: string };
  return json.ticket;
}

type Session = { ws: WebSocket; selfId: number; events: S2CMessage[] };

async function connect(handle: string): Promise<Session> {
  const ticket = await getTicket(handle);
  return new Promise<Session>((resolve, reject) => {
    const ws = new WebSocket(WS_URL);
    const events: S2CMessage[] = [];
    const timer = setTimeout(() => reject(new Error('timeout esperando WELCOME')), 4000);
    ws.on('open', () => ws.send(encode({ op: C2S.HELLO, ticket, protocol: PROTOCOL_VERSION })));
    ws.on('message', (data: Buffer) => {
      const msg = decode<S2CMessage>(data.toString());
      if (!msg) return;
      events.push(msg);
      if (msg.op === S2C.WELCOME) {
        clearTimeout(timer);
        resolve({ ws, selfId: msg.selfId, events });
      }
    });
    ws.on('error', reject);
  });
}

function findSelf(events: S2CMessage[], selfId: number): DeltaEntity | undefined {
  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i];
    if (e && e.op === S2C.DELTA) return e.entities.find((x) => x.id === selfId);
  }
  return undefined;
}

async function main(): Promise<void> {
  let fails = 0;
  const ok = (m: string) => console.log(`  ✓ ${m}`);
  const bad = (m: string) => {
    console.log(`  ✗ ${m}`);
    fails++;
  };

  console.log('world-server · verificación');

  // 1) HELLO → WELCOME
  const a = await connect('carlos');
  ok(`HELLO→WELCOME (selfId=${a.selfId})`);

  // 2) INPUT mueve la entidad (autoritativo)
  for (let i = 0; i < 16; i++) {
    a.ws.send(encode({ op: C2S.INPUT, seq: i + 1, f: 1, r: 0, yaw: 0, dtMs: 50 }));
    await sleep(50);
  }
  await sleep(150);
  const me = findSelf(a.events, a.selfId);
  if (me && me.z < 5.5) ok(`INPUT mueve la entidad por el server (z=${me.z.toFixed(2)})`);
  else bad(`la entidad no se movió (${JSON.stringify(me)})`);

  // 3) segundo cliente → el primero recibe ENTITY_JOIN
  const mark = a.events.length;
  const b = await connect('ana');
  await sleep(200);
  if (a.events.slice(mark).some((e) => e.op === S2C.ENTITY_JOIN)) ok('ENTITY_JOIN recibido por el primer cliente');
  else bad('no llegó ENTITY_JOIN');

  // 4) ticket reusado se rechaza (un solo uso)
  const reuse = await getTicket('mallory');
  await new Promise<void>((resolve) => {
    const ws = new WebSocket(WS_URL);
    let rejected = false;
    ws.on('open', () => {
      ws.send(encode({ op: C2S.HELLO, ticket: reuse, protocol: PROTOCOL_VERSION }));
      // reusar el mismo ticket en una segunda conexión
      const ws2 = new WebSocket(WS_URL);
      ws2.on('open', () => ws2.send(encode({ op: C2S.HELLO, ticket: reuse, protocol: PROTOCOL_VERSION })));
      ws2.on('message', (d: Buffer) => {
        const m = decode<S2CMessage>(d.toString());
        if (m && m.op === S2C.ERROR) {
          rejected = true;
          ok('ticket reusado rechazado (ERROR)');
        }
        ws.close();
        ws2.close();
        resolve();
      });
    });
    setTimeout(() => {
      if (!rejected) bad('el ticket reusado no fue rechazado');
      resolve();
    }, 1500);
  });

  // 5) desconexión → ENTITY_LEAVE
  const mark2 = a.events.length;
  b.ws.close();
  await sleep(250);
  if (a.events.slice(mark2).some((e) => e.op === S2C.ENTITY_LEAVE)) ok('ENTITY_LEAVE tras desconexión');
  else bad('no llegó ENTITY_LEAVE');

  a.ws.close();
  console.log(fails === 0 ? '\n✅ world-server OK' : `\n❌ ${fails} fallo(s)`);
  await sleep(50);
  process.exit(fails === 0 ? 0 : 1);
}

main().catch((e: unknown) => {
  console.error('error de verificación:', e);
  process.exit(1);
});
