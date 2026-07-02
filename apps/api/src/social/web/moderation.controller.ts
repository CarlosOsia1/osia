import { Controller, Delete, Get, HttpCode, Param, Put, Query, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { listQuerySchema, type AccountBriefDto, type ListQueryInput, type Page } from '@osia/shared';
import { ZodValidationPipe } from '../../common/zod-validation.pipe';
import { AuthGuard, CurrentAccount, type AccountContext } from '../../common/auth.guard';
import { EmailVerifiedGuard } from '../../common/email-verified.guard';
import {
  BlockAccountUseCase,
  ListBlockedUseCase,
  ListMutedUseCase,
  MuteAccountUseCase,
  UnblockAccountUseCase,
  UnmuteAccountUseCase,
} from '../application/use-cases/moderation.use-cases';

const accountIdParam = new ZodValidationPipe(z.string().uuid());

/**
 * Control del propio espacio (R4.4): `PUT/DELETE /v1/blocks/{accountId}` + `GET /v1/blocks` y
 * `PUT/DELETE /v1/mutes/{accountId}` + `GET /v1/mutes`. Discreto: sin eventos ni notificaciones.
 * AuthGuard en todo; escrituras exigen email verificado.
 */
@Controller()
@UseGuards(AuthGuard)
export class ModerationController {
  constructor(
    private readonly blockAccount: BlockAccountUseCase,
    private readonly unblockAccount: UnblockAccountUseCase,
    private readonly listBlocked: ListBlockedUseCase,
    private readonly muteAccount: MuteAccountUseCase,
    private readonly unmuteAccount: UnmuteAccountUseCase,
    private readonly listMuted: ListMutedUseCase,
  ) {}

  @Put('blocks/:accountId')
  @HttpCode(204)
  @UseGuards(EmailVerifiedGuard)
  async block(
    @CurrentAccount() account: AccountContext,
    @Param('accountId', accountIdParam) accountId: string,
  ): Promise<void> {
    await this.blockAccount.execute(account.accountId, accountId);
  }

  @Delete('blocks/:accountId')
  @HttpCode(204)
  @UseGuards(EmailVerifiedGuard)
  async unblock(
    @CurrentAccount() account: AccountContext,
    @Param('accountId', accountIdParam) accountId: string,
  ): Promise<void> {
    await this.unblockAccount.execute(account.accountId, accountId);
  }

  @Get('blocks')
  blocks(
    @CurrentAccount() account: AccountContext,
    @Query(new ZodValidationPipe(listQuerySchema)) query: ListQueryInput,
  ): Promise<Page<AccountBriefDto>> {
    return this.listBlocked.execute(account.accountId, query);
  }

  @Put('mutes/:accountId')
  @HttpCode(204)
  @UseGuards(EmailVerifiedGuard)
  async mute(
    @CurrentAccount() account: AccountContext,
    @Param('accountId', accountIdParam) accountId: string,
  ): Promise<void> {
    await this.muteAccount.execute(account.accountId, accountId);
  }

  @Delete('mutes/:accountId')
  @HttpCode(204)
  @UseGuards(EmailVerifiedGuard)
  async unmute(
    @CurrentAccount() account: AccountContext,
    @Param('accountId', accountIdParam) accountId: string,
  ): Promise<void> {
    await this.unmuteAccount.execute(account.accountId, accountId);
  }

  @Get('mutes')
  mutes(
    @CurrentAccount() account: AccountContext,
    @Query(new ZodValidationPipe(listQuerySchema)) query: ListQueryInput,
  ): Promise<Page<AccountBriefDto>> {
    return this.listMuted.execute(account.accountId, query);
  }
}
