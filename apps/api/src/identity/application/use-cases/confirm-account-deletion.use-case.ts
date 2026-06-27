import { Inject, Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { ErrorCode } from '@osia/shared';
import { AppException } from '../../../common/app-exception';
import {
  DELETION_TOKEN_REPOSITORY,
  type DeletionTokenRepository,
} from '../ports/out/deletion-token.repository';
import { DeleteAccountUseCase } from './delete-account.use-case';

/**
 * Confirma el borrado de cuenta por el TOKEN del link de email (S2-C2). El token ES la prueba de
 * identidad (un solo uso, 24 h), así que no hace falta sesión ni contraseña. Reutiliza el borrado ya
 * confirmado (cascada + revoca en Auth + auditoría). Lanza si el token no existe, ya se usó o venció.
 */
@Injectable()
export class ConfirmAccountDeletionUseCase {
  constructor(
    @Inject(DELETION_TOKEN_REPOSITORY) private readonly tokens: DeletionTokenRepository,
    private readonly deleteAccount: DeleteAccountUseCase,
  ) {}

  async execute(token: string): Promise<void> {
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const accountId = await this.tokens.consume(tokenHash);
    if (!accountId) {
      throw new AppException(ErrorCode.BAD_REQUEST, 400, 'Enlace de borrado inválido o expirado.');
    }
    await this.deleteAccount.eraseConfirmed(accountId, 'email-link');
  }
}
