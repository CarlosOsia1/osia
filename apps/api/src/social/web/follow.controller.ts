import { Body, Controller, Delete, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { followSchema, type FollowDto, type FollowInput } from '@osia/shared';
import { ZodValidationPipe } from '../../common/zod-validation.pipe';
import { AuthGuard, CurrentAccount, type AccountContext } from '../../common/auth.guard';
import { FollowAccountUseCase } from '../application/use-cases/follow-account.use-case';
import { UnfollowAccountUseCase } from '../application/use-cases/unfollow-account.use-case';

/** Valida el `followeeAccountId` de la ruta como UUID en el borde (evita 22P02 en SQL). */
const followeeIdParam = new ZodValidationPipe(z.string().uuid());

/**
 * Grafo social (S3.2-H1): `POST /v1/follows` (seguir, idempotente) y
 * `DELETE /v1/follows/{followeeAccountId}` (dejar de seguir, idempotente). Protegido (AuthGuard) +
 * rate-limit global por IP (ThrottlerGuard de AppModule); el bucket por cuenta llega en S3.6.
 */
@Controller('follows')
@UseGuards(AuthGuard)
export class FollowController {
  constructor(
    private readonly followAccount: FollowAccountUseCase,
    private readonly unfollowAccount: UnfollowAccountUseCase,
  ) {}

  @Post()
  async follow(
    @CurrentAccount() account: AccountContext,
    @Body(new ZodValidationPipe(followSchema)) body: FollowInput,
  ): Promise<{ follow: FollowDto }> {
    return { follow: await this.followAccount.execute(account.accountId, body.followeeAccountId) };
  }

  @Delete(':followeeAccountId')
  @HttpCode(204)
  async unfollow(
    @CurrentAccount() account: AccountContext,
    @Param('followeeAccountId', followeeIdParam) followeeAccountId: string,
  ): Promise<void> {
    await this.unfollowAccount.execute(account.accountId, followeeAccountId);
  }
}
