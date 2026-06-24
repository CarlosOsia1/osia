import { Inject, Injectable } from '@nestjs/common';
import { ErrorCode, type SignupInput, type SignupResultDto } from '@osia/shared';
import { AppException } from '../../../common/app-exception';
import {
  INVITATION_REPOSITORY,
  type InvitationRepository,
} from '../ports/out/invitation.repository';
import { ACCOUNT_REPOSITORY, type AccountRepository } from '../ports/out/account.repository';
import { SUPABASE_AUTH_PORT, type SupabaseAuthPort } from '../ports/out/supabase-auth.port';
import { HandleTakenError, InvitationConflictError } from '../errors';

/**
 * Registro por invitación (S1.3-H2). El gate invite-only es 100% server-side: sin invitación
 * válida no se crea cuenta. Crea el usuario (el trigger arma el pasaporte), y cierra de forma
 * atómica (canje de invitación + handle). Si el cierre falla, compensa borrando el usuario (saga).
 * No devuelve sesión: sin email verificado no se opera (F1-DoD-3); la sesión llega en S1.5.
 */
@Injectable()
export class SignupUseCase {
  constructor(
    @Inject(INVITATION_REPOSITORY) private readonly invitations: InvitationRepository,
    @Inject(ACCOUNT_REPOSITORY) private readonly accounts: AccountRepository,
    @Inject(SUPABASE_AUTH_PORT) private readonly auth: SupabaseAuthPort,
  ) {}

  async execute(input: SignupInput): Promise<SignupResultDto> {
    // 1) Gate invite-only (server-side).
    const inv = await this.invitations.findByCode(input.code);
    if (!inv || inv.status === 'revoked' || inv.status === 'accepted') {
      throw new AppException(ErrorCode.NOT_INVITED, 403, 'Invitación inválida o ya usada.');
    }
    if (inv.status === 'expired' || (inv.expiresAt !== null && inv.expiresAt.getTime() < Date.now())) {
      throw new AppException(ErrorCode.INVITATION_EXPIRED, 410, 'Esta invitación ya expiró.');
    }

    // 2) Handle disponible (fail-fast; el cierre atómico lo reconfirma).
    if (await this.accounts.isHandleTaken(input.handle)) {
      throw new AppException(ErrorCode.HANDLE_TAKEN, 409, 'Ese handle ya está tomado.');
    }

    // 3) Crear el usuario de auth (el trigger crea cuenta+perfil+avatar por defecto).
    const user = await this.auth.createUser({
      email: input.email,
      password: input.password,
      metadata: { handle: input.handle, displayName: input.displayName },
    });

    // 4) Cierre atómico o compensación.
    try {
      const { account, profile } = await this.accounts.completeSignup({
        accountId: user.id,
        handle: input.handle,
        displayName: input.displayName,
        code: input.code,
        inviterAccountId: inv.inviterAccountId,
      });
      return { account, profile, session: null };
    } catch (e) {
      await this.auth.deleteUser(user.id).catch(() => undefined); // saga: revertir el usuario huérfano
      if (e instanceof HandleTakenError) {
        throw new AppException(ErrorCode.HANDLE_TAKEN, 409, 'Ese handle ya está tomado.');
      }
      if (e instanceof InvitationConflictError) {
        throw new AppException(ErrorCode.NOT_INVITED, 403, 'La invitación ya no está disponible.');
      }
      throw e;
    }
  }
}
