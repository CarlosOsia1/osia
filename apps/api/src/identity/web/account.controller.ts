import { Body, Controller, Delete, HttpCode, Inject, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { SESSION_REFRESH_COOKIE, deleteAccountSchema, type DeleteAccountInput } from '@osia/shared';
import { ZodValidationPipe } from '../../common/zod-validation.pipe';
import { AuthGuard, CurrentAccount, type AccountContext } from '../../common/auth.guard';
import { APP_ENV } from '../../config/config.module';
import type { Env } from '../../config/env';
import { DeleteAccountUseCase } from '../application/use-cases/delete-account.use-case';

/**
 * Account (contexto identity) — borrado de cuenta del propio residente (S2-C2). Protegido por
 * Bearer; la confirmación va por contraseña en el cuerpo. Al borrar, limpia la cookie de sesión.
 */
@Controller('accounts')
@UseGuards(AuthGuard)
export class AccountController {
  constructor(
    private readonly deleteAccount: DeleteAccountUseCase,
    @Inject(APP_ENV) private readonly env: Env,
  ) {}

  @Delete('me')
  @HttpCode(204)
  async deleteMe(
    // Pipe a nivel de @Body (NO @UsePipes: corrompería @CurrentAccount/@Res).
    @Body(new ZodValidationPipe(deleteAccountSchema)) body: DeleteAccountInput,
    @CurrentAccount() account: AccountContext,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await this.deleteAccount.execute(account.accountId, body.password);
    res.clearCookie(SESSION_REFRESH_COOKIE, { domain: this.env.COOKIE_DOMAIN, path: '/' });
  }
}
