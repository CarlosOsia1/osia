import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { listQuerySchema, type FeedItemDto, type ListQueryInput, type Page } from '@osia/shared';
import { ZodValidationPipe } from '../../common/zod-validation.pipe';
import { AuthGuard, CurrentAccount, type AccountContext } from '../../common/auth.guard';
import { GetFeedUseCase } from '../application/use-cases/get-feed.use-case';

/**
 * Feed (S3.3-H4): `GET /v1/feed` devuelve el feed materializado del lector (cronológico inverso, cursor
 * keyset). Protegido (AuthGuard) + rate-limit global por IP.
 */
@Controller('feed')
@UseGuards(AuthGuard)
export class FeedController {
  constructor(private readonly getFeed: GetFeedUseCase) {}

  @Get()
  list(
    @CurrentAccount() account: AccountContext,
    @Query(new ZodValidationPipe(listQuerySchema)) query: ListQueryInput,
  ): Promise<Page<FeedItemDto>> {
    return this.getFeed.execute(account.accountId, query);
  }
}
