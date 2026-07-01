import { Body, Controller, Delete, Get, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { createPostSchema, type CreatePostInput, type PostDto } from '@osia/shared';
import { ZodValidationPipe } from '../../common/zod-validation.pipe';
import { AuthGuard, CurrentAccount, type AccountContext } from '../../common/auth.guard';
import { EmailVerifiedGuard } from '../../common/email-verified.guard';
import { CreatePostUseCase } from '../application/use-cases/create-post.use-case';
import { GetPostUseCase } from '../application/use-cases/get-post.use-case';
import { DeletePostUseCase } from '../application/use-cases/delete-post.use-case';

const postIdParam = new ZodValidationPipe(z.string().uuid());

/**
 * Posts (S3.3-H1; detalle/borrado en S3.10): publicar, ver un post por id (deep-link, respeta
 * visibilidad) y borrar el propio (soft-delete). Protegido (AuthGuard) + rate-limit global por IP;
 * escrituras exigen email verificado.
 */
@Controller('posts')
@UseGuards(AuthGuard)
export class PostController {
  constructor(
    private readonly createPost: CreatePostUseCase,
    private readonly getPost: GetPostUseCase,
    private readonly deletePost: DeletePostUseCase,
  ) {}

  @Post()
  @UseGuards(EmailVerifiedGuard)
  async create(
    @CurrentAccount() account: AccountContext,
    @Body(new ZodValidationPipe(createPostSchema)) body: CreatePostInput,
  ): Promise<{ post: PostDto }> {
    return { post: await this.createPost.execute(account.accountId, body) };
  }

  @Get(':id')
  async get(
    @CurrentAccount() account: AccountContext,
    @Param('id', postIdParam) id: string,
  ): Promise<{ post: PostDto }> {
    return { post: await this.getPost.execute(id, account.accountId) };
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(
    @CurrentAccount() account: AccountContext,
    @Param('id', postIdParam) id: string,
  ): Promise<void> {
    await this.deletePost.execute(id, account.accountId);
  }
}
