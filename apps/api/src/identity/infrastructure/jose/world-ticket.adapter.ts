import { Inject, Injectable } from '@nestjs/common';
import { WORLD_TICKET_TTL_S } from '@osia/shared';
import { issueWorldTicket } from '@osia/shared/worldTicket';
import { APP_ENV } from '../../../config/config.module';
import type { Env } from '../../../config/env';
import type {
  WorldTicketClaims,
  WorldTicketPort,
} from '../../application/ports/out/world-ticket.port';

/**
 * Emite el world ticket usando el firmante COMPARTIDO de @osia/shared (mismo alg/jti/TTL que el
 * verificador del world-server). El secreto viene del entorno (default de dev compartido).
 */
@Injectable()
export class JoseWorldTicketAdapter implements WorldTicketPort {
  private readonly secret: string;

  constructor(@Inject(APP_ENV) env: Env) {
    this.secret = env.WORLD_TICKET_SECRET;
  }

  async issue(claims: WorldTicketClaims): Promise<{ ticket: string; expiresIn: number }> {
    const ticket = await issueWorldTicket(claims, this.secret);
    return { ticket, expiresIn: WORLD_TICKET_TTL_S };
  }
}
