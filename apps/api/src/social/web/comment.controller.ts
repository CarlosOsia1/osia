import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';
import {
  createCommentSchema,
  listQuerySchema,
  type CommentDto,
  type CreateCommentInput,
  type ListQueryInput,
  type Page,
} from '@osia/shared';
import { ZodValidationPipe } from '../../common/zod-validation.pipe';
import { AuthGuard, CurrentAccount, type AccountContext } from '../../common/auth.guard';
import { CreateCommentUseCase } from '../application/use-cases/create-comment.use-case';
import { ListCommentsUseCase } from '../application/use-cases/list-comments.use-case';
import { DeleteCommentUseCase } from '../application/use-cases/delete-comment.use-case';

/** Valida un id de ruta como UUID en el borde (evita 22P02 en SQL). */
const uuidParam = new ZodValidationPipe(z.string().uuid());

/**
 * Comentarios bajo un post (S3.3-H3): `POST /v1/posts/{id}/comments` (crear) y `GET .../comments`
 * (listar, cronológico por cursor keyset). Ambos respetan la visibilidad del post (404 si no es visible).
 * Protegido (AuthGuard) + rate-limit global por IP; `rl:comment` por cuenta llega en S3.6.
 */
@Controller('posts/:postId/comments')
@UseGuards(AuthGuard)
export class PostCommentsController {
  constructor(
    private readonly createComment: CreateCommentUseCase,
    private readonly listComments: ListCommentsUseCase,
  ) {}

  @Post()
  async create(
    @CurrentAccount() account: AccountContext,
    @Param('postId', uuidParam) postId: string,
    @Body(new ZodValidationPipe(createCommentSchema)) body: CreateCommentInput,
  ): Promise<{ comment: CommentDto }> {
    return { comment: await this.createComment.execute(postId, account.accountId, body) };
  }

  @Get()
  list(
    @CurrentAccount() account: AccountContext,
    @Param('postId', uuidParam) postId: string,
    @Query(new ZodValidationPipe(listQuerySchema)) query: ListQueryInput,
  ): Promise<Page<CommentDto>> {
    return this.listComments.execute(postId, account.accountId, query);
  }
}

/**
 * Borrado de comentario propio (S3.3-H3): `DELETE /v1/comments/{id}` (soft-delete, 204). Vive en su
 * propia ruta porque no cuelga de un post. Protegido (AuthGuard).
 */
@Controller('comments')
@UseGuards(AuthGuard)
export class CommentsController {
  constructor(private readonly deleteComment: DeleteCommentUseCase) {}

  @Delete(':commentId')
  @HttpCode(204)
  async remove(
    @CurrentAccount() account: AccountContext,
    @Param('commentId', uuidParam) commentId: string,
  ): Promise<void> {
    await this.deleteComment.execute(commentId, account.accountId);
  }
}
