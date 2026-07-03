import './load-env'; // PRIMER import: carga .env antes que nada lea process.env
import 'reflect-metadata';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import type { NextFunction, Request, Response } from 'express';
import { NestFactory } from '@nestjs/core';
import type { INestApplication } from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { loadEnv } from './config/env';

// El watcher de dev reinicia el proceso antes de que el SO suelte el puerto (EADDRINUSE fugaz,
// típico en Windows): reintentar el bind unos instantes en vez de morir al primer intento.
const LISTEN_RETRIES = 10;
const LISTEN_RETRY_DELAY_MS = 300;

function isAddrInUse(err: unknown): boolean {
  return err instanceof Error && (err as NodeJS.ErrnoException).code === 'EADDRINUSE';
}

async function listenWithRetry(app: INestApplication, port: number): Promise<void> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      await app.listen(port);
      return;
    } catch (err) {
      if (!isAddrInUse(err) || attempt >= LISTEN_RETRIES) throw err;
      await new Promise<void>((resolve) => setTimeout(resolve, LISTEN_RETRY_DELAY_MS));
    }
  }
}

/** Composition root de apps/api (NestJS hexagonal). */
async function bootstrap(): Promise<void> {
  const env = loadEnv();
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger)); // Pino como logger de Nest

  // §8 Seguridad: helmet (nosniff/frame DENY/HSTS/…) + Permissions-Policy (la API no usa mic/cam/geo).
  app.use(helmet({ frameguard: { action: 'deny' } })); // §8: frame DENY (no SAMEORIGIN)
  app.use(cookieParser()); // parsea la cookie de refresh del SSO (req.cookies)
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Permissions-Policy', 'microphone=(), camera=(), geolocation=()');
    next();
  });
  // CORS allowlist (nunca '*'); credentials para la cookie de refresh del SSO.
  app.enableCors({ origin: [...env.corsOrigins], credentials: true });

  // Todas las rutas REST cuelgan de /v1 (docs/10 §1.2); las health probes quedan fuera.
  app.setGlobalPrefix('v1', { exclude: ['healthz', 'healthz/ready'] });
  await listenWithRetry(app, env.PORT);
}

void bootstrap();
