/**
 * Transporte HTTP del world-server: CORS, security headers (§8), gate de Origin, emisión de
 * world tickets y /health. Separado del WS y los handlers de protocolo (§1.1-S).
 */

import { createServer, type Server, type ServerResponse } from 'node:http';
import { normalizeHandle, DEFAULT_WORLD_ID } from '@osia/shared';
import { config } from './config';
import { issueTicket } from './ticket';
import { KeyedRateLimiter } from './rateLimit';
import type { World } from './state';

function setCors(res: ServerResponse, origin: string | undefined): void {
  if (origin && config.corsOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'content-type');
}

/** §8 Security headers para toda respuesta HTTP (el endpoint solo sirve JSON). */
function setSecurityHeaders(res: ServerResponse): void {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Content-Security-Policy', "default-src 'none'");
  if (config.isProd) {
    res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains');
  }
}

/** §8: solo orígenes permitidos. CORS es protección de navegador; un cliente no-browser sin
 *  Origin no debe poder mintar tickets ni conectarse en prod (en dev/local se permite). */
export function originAllowed(origin: string | undefined): boolean {
  if (!config.isProd) return true; // dev / verify-client local pueden no enviar Origin
  return origin !== undefined && config.corsOrigins.includes(origin);
}

/** Cuerpo JSON de /metrics (S2-C1): tick (EWMA/bytes) + conexiones WS + jugadores + difusiones. */
export function metricsPayload(world: World): string {
  return JSON.stringify({
    tick: world.metrics.snapshot(),
    connections: world.conns.size,
    players: world.hub.entities.size,
    atmosphereBroadcasts: world.atmosphereBroadcasts,
    ts: Date.now(),
  });
}

export function createHttpServer(world: World): Server {
  // Rate-limit de emisión de tickets por IP (anti-flood): ~20 por minuto.
  const ticketLimiter = new KeyedRateLimiter(20, 3000);

  return createServer((req, res) => {
    setCors(res, req.headers.origin);
    setSecurityHeaders(res);
    if (req.method === 'OPTIONS') return void res.writeHead(204).end();

    if (req.method === 'GET' && req.url === '/health') {
      return void res
        .writeHead(200, { 'content-type': 'application/json' })
        .end(JSON.stringify({ ok: true, players: world.hub.entities.size, metrics: world.metrics.snapshot() }));
    }

    // Observabilidad (S2-C1): lo que ya se mide (tick EWMA, bytes/jugador) + conexiones WS y el
    // contador de difusiones de atmósfera. Solo lectura, en memoria (<5 ms), sin Redis ni IA;
    // responde SIEMPRE (también con 0 jugadores) para servir de liveness. Como /health, no exige Origin.
    if (req.method === 'GET' && req.url === '/metrics') {
      return void res
        .writeHead(200, { 'content-type': 'application/json' })
        .end(metricsPayload(world));
    }

    if (req.method === 'POST' && req.url === '/world/tickets') {
      if (!originAllowed(req.headers.origin)) {
        return void res
          .writeHead(403, { 'content-type': 'application/json' })
          .end(JSON.stringify({ error: 'forbidden_origin' }));
      }
      const ip = req.socket.remoteAddress ?? 'unknown';
      if (!ticketLimiter.take(ip, Date.now())) {
        return void res
          .writeHead(429, { 'content-type': 'application/json' })
          .end(JSON.stringify({ error: 'rate_limit' }));
      }
      let body = '';
      req.on('data', (c: Buffer) => {
        body += c;
        if (body.length > 4096) req.destroy();
      });
      req.on('end', () => {
        void (async () => {
          try {
            const parsed = JSON.parse(body || '{}') as { worldId?: string; handle?: string };
            const handle = normalizeHandle(parsed.handle ?? ''); // saneo (anti-spoof RTL/zero-width)
            const worldId = String(parsed.worldId ?? DEFAULT_WORLD_ID);
            const ticket = await issueTicket(handle, worldId);
            res
              .writeHead(200, { 'content-type': 'application/json' })
              .end(JSON.stringify({ ticket, wsUrl: config.publicWsUrl }));
          } catch {
            res
              .writeHead(400, { 'content-type': 'application/json' })
              .end(JSON.stringify({ error: 'bad_request' }));
          }
        })();
      });
      return;
    }

    res.writeHead(404).end();
  });
}
