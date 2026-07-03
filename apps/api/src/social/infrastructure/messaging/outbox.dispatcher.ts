import { Inject, Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { OUTBOX_STORE, type OutboxStore } from '../../application/ports/out/outbox.store';

/** Cada cuánto el dispatcher busca eventos pendientes en `social.outbox`. */
const POLL_INTERVAL_MS = 1000;
/** Tope de reintentos por evento; superado, la fila queda dead-letter (con `last_error`) y no se re-toma. */
const MAX_ATTEMPTS = 8;
/** Eventos procesados por vuelta (acota el trabajo por tick; el resto va en la siguiente). */
const BATCH_SIZE = 100;

/**
 * Entrega los eventos de `social.outbox` al bus in-process (Ola 1C). Cada ~1 s reclama un lote de
 * pendientes y los `emitAsync` a los `@OnEvent` (reputación, fan-out, notificaciones), ESPERANDO a que
 * terminen: solo si todos los consumidores del evento resuelven se marca `published_at`; si alguno lanza,
 * la fila queda pendiente y se reintenta (hasta `MAX_ATTEMPTS`). Entrega at-least-once → los consumidores
 * DEBEN ser idempotentes (reputación por dedup, fan-out `ON CONFLICT`, notificación por id determinista).
 */
@Injectable()
export class OutboxDispatcher implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxDispatcher.name);
  private timer: ReturnType<typeof setInterval> | null = null;
  private draining = false;

  constructor(
    private readonly emitter: EventEmitter2,
    // El store se inyecta por token (es un puerto, sin clase concreta que Nest resuelva por tipo).
    @Inject(OUTBOX_STORE) private readonly outbox: OutboxStore,
  ) {}

  onModuleInit(): void {
    // El poll NO se solapa consigo mismo (el flag `draining` lo evita); ante error, loguea y sigue.
    this.timer = setInterval(() => {
      void this.drainOnce().catch((err) =>
        this.logger.error(`poll del outbox falló: ${err instanceof Error ? err.message : String(err)}`),
      );
    }, POLL_INTERVAL_MS);
    // No mantengas vivo el proceso solo por este timer (permite un apagado limpio).
    this.timer.unref?.();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  /**
   * Drena un lote de eventos pendientes. Devuelve cuántos se entregaron con éxito. Público para poder
   * ejercerlo en tests sin depender del timer. Reentrante-seguro: si ya hay un drenado en curso, sale.
   */
  async drainOnce(): Promise<number> {
    if (this.draining) return 0;
    this.draining = true;
    let delivered = 0;
    try {
      const batch = await this.outbox.claimBatch(MAX_ATTEMPTS, BATCH_SIZE);
      for (const record of batch) {
        try {
          // emitAsync ESPERA a todos los `@OnEvent`; si alguno lanza, Promise.all rechaza → catch.
          await this.emitter.emitAsync(record.topic, record.payload);
          await this.outbox.markPublished(record.id);
          delivered += 1;
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          this.logger.warn(`evento ${record.topic} (${record.id}) falló, se reintentará: ${message}`);
          await this.outbox.markFailed(record.id, message);
        }
      }
    } finally {
      this.draining = false;
    }
    return delivered;
  }
}
