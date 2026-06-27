import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RetentionService } from '../../application/retention.service';

/**
 * Adaptador de scheduling (driving adapter, infraestructura): dispara la purga de retención cada día.
 * La lógica vive en RetentionService.runOnce() (application, pura y testeable); aquí solo el trigger
 * @Cron, igual que un controller HTTP dispara un use-case. Así la capa application no depende del
 * framework de scheduling.
 */
@Injectable()
export class RetentionCron {
  constructor(private readonly retention: RetentionService) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async run(): Promise<void> {
    await this.retention.runOnce();
  }
}
