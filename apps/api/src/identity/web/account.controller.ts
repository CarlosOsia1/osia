import { Body, Controller, Delete, HttpCode, Inject, Post, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import {
  SESSION_REFRESH_COOKIE,
  deleteAccountSchema,
  confirmAccountDeletionSchema,
  type DeleteAccountInput,
  type ConfirmAccountDeletionInput,
} from '@osia/shared';
import { ZodValidationPipe } from '../../common/zod-validation.pipe';
import { AuthGuard, CurrentAccount, type AccountContext } from '../../common/auth.guard';
import { APP_ENV } from '../../config/config.module';
import type { Env } from '../../config/env';
import { DeleteAccountUseCase } from '../application/use-cases/delete-account.use-case';
import { RequestAccountDeletionUseCase } from '../application/use-cases/request-account-deletion.use-case';
import { ConfirmAccountDeletionUseCase } from '../application/use-cases/confirm-account-deletion.use-case';

/**
 * Account (contexto identity) — borrado de cuenta del residente (S2-C2), por DOS caminos:
 *  · Inmediato confirmando por CONTRASEÑA (protegido por Bearer).
 *  · Por LINK de email (24 h, un solo uso): pedirlo es protegido; confirmarlo es público (el token
 *    ES la prueba). Ambos limpian la cookie de sesión al cerrar.
 * El guard se aplica POR MÉTODO (la confirmación por link no lleva sesión).
 */
@Controller('accounts')
export class AccountController {
  constructor(
    private readonly deleteAccount: DeleteAccountUseCase,
    private readonly requestDeletion: RequestAccountDeletionUseCase,
    private readonly confirmDeletion: ConfirmAccountDeletionUseCase,
    @Inject(APP_ENV) private readonly env: Env,
  ) {}

  @Delete('me')
  @UseGuards(AuthGuard)
  @HttpCode(204)
  async deleteMe(
    // Pipe a nivel de @Body (NO @UsePipes: corrompería @CurrentAccount/@Res).
    @Body(new ZodValidationPipe(deleteAccountSchema)) body: DeleteAccountInput,
    @CurrentAccount() account: AccountContext,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await this.deleteAccount.execute(account.accountId, body.password);
    this.clearSession(res);
  }

  /** Pide el LINK de borrado por email (protegido). 204: aceptado, revisa tu correo. */
  @Post('me/deletion-request')
  @UseGuards(AuthGuard)
  @HttpCode(204)
  async requestDeletionByEmail(@CurrentAccount() account: AccountContext): Promise<void> {
    await this.requestDeletion.execute(account.accountId);
  }

  /** Confirma el borrado por el token del link (PÚBLICO: el token es la prueba de identidad). */
  @Post('deletion/confirm')
  @HttpCode(204)
  async confirmDeletionByEmail(
    @Body(new ZodValidationPipe(confirmAccountDeletionSchema)) body: ConfirmAccountDeletionInput,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await this.confirmDeletion.execute(body.token);
    this.clearSession(res);
  }

  private clearSession(res: Response): void {
    res.clearCookie(SESSION_REFRESH_COOKIE, { domain: this.env.COOKIE_DOMAIN, path: '/' });
  }
}
