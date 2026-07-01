import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { listQuerySchema, type ListQueryInput, type Page, type ProfileBrief } from '@osia/shared';
import { ZodValidationPipe } from '../../common/zod-validation.pipe';
import { AuthGuard, CurrentAccount, type AccountContext } from '../../common/auth.guard';
import { FollowGraphService } from '../application/follow-graph.service';

/**
 * Listas del grafo social (S3.2-H2): `GET /v1/profiles/{handle}/followers|following` →
 * `Page<ProfileBrief>` por cursor keyset. Protegido (AuthGuard). Convive con el `ProfileController`
 * de identity (mismas rutas base `profiles`, sub-paths distintos; sin colisión).
 */
@Controller('profiles')
@UseGuards(AuthGuard)
export class FollowGraphController {
  constructor(private readonly graph: FollowGraphService) {}

  @Get(':handle/followers')
  followers(
    @CurrentAccount() account: AccountContext,
    @Param('handle') handle: string,
    @Query(new ZodValidationPipe(listQuerySchema)) query: ListQueryInput,
  ): Promise<Page<ProfileBrief>> {
    return this.graph.listFollowers(handle, account.accountId, query);
  }

  @Get(':handle/following')
  following(
    @CurrentAccount() account: AccountContext,
    @Param('handle') handle: string,
    @Query(new ZodValidationPipe(listQuerySchema)) query: ListQueryInput,
  ): Promise<Page<ProfileBrief>> {
    return this.graph.listFollowing(handle, account.accountId, query);
  }
}
