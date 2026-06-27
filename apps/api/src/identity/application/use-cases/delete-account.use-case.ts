import { Inject, Injectable, Logger } from '@nestjs/common';
import { ErrorCode } from '@osia/shared';
import { AppException } from '../../../common/app-exception';
import { ACCOUNT_REPOSITORY, type AccountRepository } from '../ports/out/account.repository';
import { AUTH_SESSION_PORT, type AuthSessionPort } from '../ports/out/auth-session.port';
import { SUPABASE_AUTH_PORT, type SupabaseAuthPort } from '../ports/out/supabase-auth.port';
import { EmailNotVerifiedError, InvalidCredentialsError } from '../errors';

/**
 * Borra la cuenta de un residente DE VERDAD (privacidad real, S2-C2):
 *  1) Confirma con la CONTRASEÑA (no se borra por accidente ni con una sesión robada).
 *  2) Elimina los datos locales en una transacción con cascada de FKs (perfil, avatares,
 *     verificaciones, presencia; invitaciones anonimizadas).
 *  3) Borra el usuario de Supabase Auth → REVOCA todas sus sesiones. Best-effort: si Auth falla,
 *     el borrado local ya procedió (el usuario pierde acceso igual) y se loguea WARN.
 * Idempotente: re-ejecutar sobre una cuenta ya borrada no rompe.
 */
@Injectable()
export class DeleteAccountUseCase {
  private readonly logger = new Logger(DeleteAccountUseCase.name);

  constructor(
    @Inject(ACCOUNT_REPOSITORY) private readonly accounts: AccountRepository,
    @Inject(AUTH_SESSION_PORT) private readonly sessions: AuthSessionPort,
    @Inject(SUPABASE_AUTH_PORT) private readonly auth: SupabaseAuthPort,
  ) {}

  async execute(accountId: string, password: string): Promise<void> {
    const email = await this.accounts.getEmail(accountId);
    if (!email) return; // ya borrada → idempotente: nada que confirmar ni eliminar

    // 1) Confirmación: la contraseña debe ser correcta. Un email no verificado igual prueba la
    //    contraseña (Supabase valida credenciales antes de bloquear por verificación) → se permite.
    try {
      await this.sessions.signInWithPassword(email, password);
    } catch (e) {
      if (e instanceof InvalidCredentialsError) {
        throw new AppException(ErrorCode.INVALID_CREDENTIALS, 401, 'Contraseña incorrecta.');
      }
      if (!(e instanceof EmailNotVerifiedError)) throw e;
    }

    // 2) Borrado local atómico (cascada). 3) Borrado en Auth (revoca todas las sesiones).
    await this.accounts.deleteAccount(accountId);
    try {
      await this.auth.deleteUser(accountId);
    } catch (err) {
      this.logger.warn(
        `borrado de cuenta: la eliminación en Auth falló (${
          err instanceof Error ? err.message : 'desconocido'
        }) — el borrado local procedió`,
      );
    }
    this.logger.log(`account.deleted ${accountId}`); // evento de dominio (bus de eventos en fase futura)
  }
}
