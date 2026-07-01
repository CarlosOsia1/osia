import { Body, Controller, Delete, Get, HttpCode, Param, Put, Query, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import {
  REACTION_KIND_VALUES,
  reactionsQuerySchema,
  setReactionSchema,
  type Page,
  type ReactionActorDto,
  type ReactionResult,
  type ReactionsQueryInput,
  type SetReactionInput,
} from '@osia/shared';
import { ZodValidationPipe } from '../../common/zod-validation.pipe';
import { AuthGuard, CurrentAccount, type AccountContext } from '../../common/auth.guard';
import { EmailVerifiedGuard } from '../../common/email-verified.guard';
import { SetReactionUseCase } from '../application/use-cases/set-reaction.use-case';
import { RemoveReactionUseCase } from '../application/use-cases/remove-reaction.use-case';
import { ListReactionsUseCase } from '../application/use-cases/list-reactions.use-case';

/** Valida los params de ruta en el borde (evita 22P02/valores inválidos en SQL). */
const postIdParam = new ZodValidationPipe(z.string().uuid());
const kindParam = new ZodValidationPipe(z.enum(REACTION_KIND_VALUES));

/**
 * Reacciones (S3.3-H2): `PUT /v1/posts/{id}/reactions {kind}` (idempotente) y
 * `DELETE /v1/posts/{id}/reactions/{kind}` (idempotente, 204). Protegido (AuthGuard) + rate-limit global
 * por IP; `rl:react` por cuenta llega en S3.6.
 */
@Controller('posts/:postId/reactions')
@UseGuards(AuthGuard)
export class ReactionController {
  constructor(
    private readonly setReaction: SetReactionUseCase,
    private readonly removeReaction: RemoveReactionUseCase,
    private readonly listReactions: ListReactionsUseCase,
  ) {}

  @Get()
  list(
    @CurrentAccount() account: AccountContext,
    @Param('postId', postIdParam) postId: string,
    @Query(new ZodValidationPipe(reactionsQuerySchema)) query: ReactionsQueryInput,
  ): Promise<Page<ReactionActorDto>> {
    return this.listReactions.execute(postId, account.accountId, query.kind ?? null, query);
  }

  @Put()
  @UseGuards(EmailVerifiedGuard)
  react(
    @CurrentAccount() account: AccountContext,
    @Param('postId', postIdParam) postId: string,
    @Body(new ZodValidationPipe(setReactionSchema)) body: SetReactionInput,
  ): Promise<ReactionResult> {
    return this.setReaction.execute(postId, account.accountId, body.kind);
  }

  @Delete(':kind')
  @HttpCode(204)
  @UseGuards(EmailVerifiedGuard)
  async unreact(
    @CurrentAccount() account: AccountContext,
    @Param('postId', postIdParam) postId: string,
    @Param('kind', kindParam) kind: SetReactionInput['kind'],
  ): Promise<void> {
    await this.removeReaction.execute(postId, account.accountId, kind);
  }
}
