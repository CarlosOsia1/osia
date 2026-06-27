import { Inject, Injectable, Logger } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { ACCOUNT_REPOSITORY, type AccountRepository } from '../ports/out/account.repository';
import {
  DELETION_TOKEN_REPOSITORY,
  type DeletionTokenRepository,
} from '../ports/out/deletion-token.repository';
import { EMAIL_PORT, type EmailPort } from '../ports/out/email.port';
import { APP_ENV } from '../../../config/config.module';
import type { Env } from '../../../config/env';

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // el link vive 24 h

/**
 * Pide el borrado de cuenta por LINK de email (S2-C2, alternativa al borrado por contraseña):
 * genera un token de un solo uso (guarda solo su hash), arma el link y lo manda al email de la
 * cuenta. Silencioso si la cuenta no existe (no se revela nada). El borrado real ocurre al confirmar.
 */
@Injectable()
export class RequestAccountDeletionUseCase {
  private readonly logger = new Logger(RequestAccountDeletionUseCase.name);

  constructor(
    @Inject(ACCOUNT_REPOSITORY) private readonly accounts: AccountRepository,
    @Inject(DELETION_TOKEN_REPOSITORY) private readonly tokens: DeletionTokenRepository,
    @Inject(EMAIL_PORT) private readonly email: EmailPort,
    @Inject(APP_ENV) private readonly env: Env,
  ) {}

  async execute(accountId: string): Promise<void> {
    const email = await this.accounts.getEmail(accountId);
    if (!email) return; // cuenta inexistente/ya borrada → idempotente y sin filtrar información

    // Token limpio al usuario (en el link); en la DB solo su hash (si se filtra la tabla, no sirve).
    const token = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    await this.tokens.create(accountId, tokenHash, new Date(Date.now() + TOKEN_TTL_MS));

    const link = `${this.env.APP_BASE_URL}/cuenta/borrar?token=${token}`;
    await this.email.sendAccountDeletionLink(email, link);
    this.logger.log(`account.deletion-requested ${accountId}`);
  }
}
