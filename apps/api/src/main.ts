import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

/** Composition root de apps/api (NestJS hexagonal). Verá su forma completa en S1.3. */
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  // Todas las rutas REST cuelgan de /v1 (docs/10 §1.2); /healthz queda fuera del versionado.
  app.setGlobalPrefix('v1', { exclude: ['healthz'] });
  const port = Number(process.env.PORT ?? 4000);
  await app.listen(port);
}

void bootstrap();
