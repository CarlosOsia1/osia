import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import {
  listQuerySchema,
  type ListQueryInput,
  type Page,
  type PostDto,
  type PublicProfileDto,
} from '@osia/shared';
import { ZodValidationPipe } from '../../common/zod-validation.pipe';
import { AuthGuard, CurrentAccount, type AccountContext } from '../../common/auth.guard';
import { GetPublicProfileUseCase } from '../application/use-cases/get-public-profile.use-case';
import { ListProfilePostsUseCase } from '../application/use-cases/list-profile-posts.use-case';

/** Valida el handle de la ruta (formato del pasaporte; el match real es citext en la query). */
const handleParam = new ZodValidationPipe(z.string().regex(/^[a-zA-Z0-9_]{3,20}$/));

/**
 * Perfil público (S3.5-H1): `GET /v1/profiles/{handle}` (estatus: brief + reputación + conteos +
 * isFollowing) y `GET /v1/profiles/{handle}/posts` (posts visibles, cursor keyset). Protegido (AuthGuard).
 * `/v1/profiles/me` (identity) y `/followers|following` (grafo) conviven: rutas distintas, no chocan.
 */
@Controller('profiles')
@UseGuards(AuthGuard)
export class PublicProfileController {
  constructor(
    private readonly getProfile: GetPublicProfileUseCase,
    private readonly listPosts: ListProfilePostsUseCase,
  ) {}

  @Get(':handle')
  async get(
    @CurrentAccount() account: AccountContext,
    @Param('handle', handleParam) handle: string,
  ): Promise<{ profile: PublicProfileDto }> {
    return { profile: await this.getProfile.execute(handle, account.accountId) };
  }

  @Get(':handle/posts')
  posts(
    @CurrentAccount() account: AccountContext,
    @Param('handle', handleParam) handle: string,
    @Query(new ZodValidationPipe(listQuerySchema)) query: ListQueryInput,
  ): Promise<Page<PostDto>> {
    return this.listPosts.execute(handle, account.accountId, query);
  }
}
