import { Inject, Injectable } from '@nestjs/common';
import { ErrorCode } from '@osia/shared';
import { AppException } from '../../../common/app-exception';
import { ACCOUNT_REPOSITORY, type AccountRepository } from '../ports/out/account.repository';
import { AUTH_SESSION_PORT, type AuthSessionPort } from '../ports/out/auth-session.port';
import { AccountErasureService } from '../account-erasure.service';
import { EmailNotVerifiedError, InvalidCredentialsError } from '../errors';

/**
 * Borra la cuenta de un residente DE VERDAD (privacidad real, S2-C2), confirmando por CONTRASEÑA:
 *  1) Confirma con la contraseña (no se borra por accidente ni con una sesión robada).
 *  2) Delega el borrado ya confirmado en AccountErasureService (cascada + revoca Auth + auditoría).
 * Idempotente: re-ejecutar sobre una cuenta ya borrada no rompe.
 */
@Injectable()
export class DeleteAccountUseCase {
  constructor(
    @Inject(ACCOUNT_REPOSITORY) private readonly accounts: AccountRepository,
    @Inject(AUTH_SESSION_PORT) private readonly sessions: AuthSessionPort,
    private readonly erasure: AccountErasureService,
  ) {}

  async execute(accountId: string, password: string): Promise<void> {
    const email = await this.accounts.getEmail(accountId);
    if (!email) return; // ya borrada → idempotente: nada que confirmar ni eliminar

    // Confirmación: la contraseña debe ser correcta. Un email no verificado igual prueba la
    // contraseña (Supabase valida credenciales antes de bloquear por verificación) → se permite.
    try {
      await this.sessions.signInWithPassword(email, password);
    } catch (e) {
      if (e instanceof InvalidCredentialsError) {
        throw new AppException(ErrorCode.INVALID_CREDENTIALS, 401, 'Contraseña incorrecta.');
      }
      if (!(e instanceof EmailNotVerifiedError)) throw e;
    }

    await this.erasure.erase(accountId, 'password');
  }
}
