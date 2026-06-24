import { Inject, Injectable } from '@nestjs/common';
import { ErrorCode, type WorldTicketDto } from '@osia/shared';
import { AppException } from '../../../common/app-exception';
import { APP_ENV } from '../../../config/config.module';
import type { Env } from '../../../config/env';
import { ACCOUNT_REPOSITORY, type AccountRepository } from '../ports/out/account.repository';
import { WORLD_TICKET_PORT, type WorldTicketPort } from '../ports/out/world-ticket.port';

/**
 * Emite un world ticket para una cuenta autenticada. Solo cuentas con email verificado
 * (scope `world:join` / featureFlags.world) pueden entrar al Mundo (F1-DoD-3, S1.3-H5).
 */
@Injectable()
export class IssueWorldTicketUseCase {
  constructor(
    @Inject(ACCOUNT_REPOSITORY) private readonly accounts: AccountRepository,
    @Inject(WORLD_TICKET_PORT) private readonly tickets: WorldTicketPort,
    @Inject(APP_ENV) private readonly env: Env,
  ) {}

  async execute(accountId: string, worldId: string): Promise<WorldTicketDto> {
    const passport = await this.accounts.getPassport(accountId);
    if (!passport) throw new AppException(ErrorCode.NOT_FOUND, 404, 'Pasaporte no encontrado.');
    if (!passport.featureFlags.world) {
      throw new AppException(ErrorCode.EMAIL_NOT_VERIFIED, 403, 'Verificá tu email para entrar al Mundo.');
    }
    const { ticket, expiresIn } = await this.tickets.issue({
      handle: passport.profile.handle,
      worldId,
      accountId,
      accentColor: passport.profile.accentColor,
    });
    return { ticket, expiresIn, wsUrl: this.env.WORLD_WS_URL };
  }
}
