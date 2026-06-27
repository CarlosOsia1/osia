import { Inject, Injectable, Logger } from '@nestjs/common';
import { ACCOUNT_REPOSITORY, type AccountRepository } from './ports/out/account.repository';
import { SUPABASE_AUTH_PORT, type SupabaseAuthPort } from './ports/out/supabase-auth.port';
import { AUDIT_LOG_REPOSITORY, type AuditLogRepository } from './ports/out/audit-log.repository';

/**
 * Borrado YA CONFIRMADO de una cuenta, reutilizable por AMBOS caminos (contraseña y link de email):
 * elimina local en cascada, revoca en Auth (best-effort) y audita. NO confirma identidad — quien
 * llama ya la validó. Idempotente. Vive como colaborador propio para que cada use-case dependa de
 * esta abstracción y no uno del otro (§1.1-D, SRP).
 */
@Injectable()
export class AccountErasureService {
  private readonly logger = new Logger(AccountErasureService.name);

  constructor(
    @Inject(ACCOUNT_REPOSITORY) private readonly accounts: AccountRepository,
    @Inject(SUPABASE_AUTH_PORT) private readonly auth: SupabaseAuthPort,
    @Inject(AUDIT_LOG_REPOSITORY) private readonly audit: AuditLogRepository,
  ) {}

  async erase(accountId: string, method: 'password' | 'email-link'): Promise<void> {
    const deleted = await this.accounts.deleteAccount(accountId);
    try {
      await this.auth.deleteUser(accountId); // revoca todas las sesiones
    } catch (err) {
      this.logger.warn(
        `borrado de cuenta: la eliminación en Auth falló (${
          err instanceof Error ? err.message : 'desconocido'
        }) — el borrado local procedió`,
      );
    }
    if (deleted) {
      // Auditoría best-effort: una entrada perdida no debe romper el borrado.
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
    this.logger.log(`account.deleted ${accountId} (${method})`);
  }
}
