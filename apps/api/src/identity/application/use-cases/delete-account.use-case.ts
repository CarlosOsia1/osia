import { Inject, Injectable, Logger } from '@nestjs/common';
import { ErrorCode } from '@osia/shared';
import { AppException } from '../../../common/app-exception';
import { ACCOUNT_REPOSITORY, type AccountRepository } from '../ports/out/account.repository';
import { AUTH_SESSION_PORT, type AuthSessionPort } from '../ports/out/auth-session.port';
import { SUPABASE_AUTH_PORT, type SupabaseAuthPort } from '../ports/out/supabase-auth.port';
import { AUDIT_LOG_REPOSITORY, type AuditLogRepository } from '../ports/out/audit-log.repository';
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
    @Inject(AUDIT_LOG_REPOSITORY) private readonly audit: AuditLogRepository,
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

    // Confirmada la identidad por contraseña → borra de verdad (lo reutiliza el borrado por link).
    await this.eraseConfirmed(accountId, 'password');
  }

  /**
   * Borrado YA CONFIRMADO (por contraseña o por link de email): elimina local en cascada, revoca en
   * Auth (best-effort) y audita. NO confirma identidad — quien llama ya la validó. Idempotente.
   */
  async eraseConfirmed(accountId: string, method: 'password' | 'email-link'): Promise<void> {
    const deleted = await this.accounts.deleteAccount(accountId);
    try {
      await this.auth.deleteUser(accountId);
    } catch (err) {
      this.logger.warn(
        `borrado de cuenta: la eliminación en Auth falló (${
          err instanceof Error ? err.message : 'desconocido'
        }) — el borrado local procedió`,
      );
    }
    if (deleted) await this.writeAudit(accountId, method);
    this.logger.log(`account.deleted ${accountId} (${method})`);
  }

  /** Bitácora de auditoría del borrado (best-effort: una auditoría perdida no debe romper el borrado). */
  private async writeAudit(accountId: string, method: 'password' | 'email-link'): Promise<void> {
    try {
      await this.audit.record({
        entityType: 'account',
        entityId: accountId,
        action: 'account.deleted',
        actorId: accountId,
        metadata: { method },
      });
    } catch (err) {
      this.logger.warn(
        `borrado de cuenta: no se pudo registrar la auditoría (${
          err instanceof Error ? err.message : 'desconocido'
        })`,
      );
    }
  }
}
