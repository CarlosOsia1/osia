import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { FEED_REPOSITORY, type FeedRepository } from './ports/out/feed.repository';

/**
 * Poda de retención del feed materializado (S3.3-H4): un cron diario borra `feed_items` viejos para
 * mantener la DB bajo el límite del free tier. El feed es caché reconstruible (fan-out), no la verdad,
 * así que podar es seguro. Absorbe errores (no debe tumbar el proceso).
 */
@Injectable()
export class FeedRetentionService {
  private readonly logger = new Logger(FeedRetentionService.name);
  /** Días de retención de un ítem de feed antes de podarlo. */
  private static readonly RETENTION_DAYS = 90;

  constructor(@Inject(FEED_REPOSITORY) private readonly feed: FeedRepository) {}

  @Cron(CronExpression.EVERY_DAY_AT_4AM)
  async prune(): Promise<void> {
    try {
      const removed = await this.feed.pruneOlderThan(FeedRetentionService.RETENTION_DAYS);
      if (removed > 0) {
        this.logger.log(`poda de feed: ${removed} ítems > ${FeedRetentionService.RETENTION_DAYS} días`);
      }
    } catch (err) {
      this.logger.warn(`poda de feed falló: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}
