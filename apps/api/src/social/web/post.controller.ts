import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { createPostSchema, type CreatePostInput, type PostDto } from '@osia/shared';
import { ZodValidationPipe } from '../../common/zod-validation.pipe';
import { AuthGuard, CurrentAccount, type AccountContext } from '../../common/auth.guard';
import { EmailVerifiedGuard } from '../../common/email-verified.guard';
import { CreatePostUseCase } from '../application/use-cases/create-post.use-case';

/**
 * Posts (S3.3-H1): `POST /v1/posts` publica un post (texto y/o hasta 4 adjuntos por URL prefirmada).
 * Protegido (AuthGuard) + rate-limit global por IP; `rl:post` por cuenta y guard de email-verificado
 * llegan en S3.6.
 */
@Controller('posts')
@UseGuards(AuthGuard)
export class PostController {
  constructor(private readonly createPost: CreatePostUseCase) {}

  @Post()
  @UseGuards(EmailVerifiedGuard)
  async create(
    @CurrentAccount() account: AccountContext,
    @Body(new ZodValidationPipe(createPostSchema)) body: CreatePostInput,
  ): Promise<{ post: PostDto }> {
    return { post: await this.createPost.execute(account.accountId, body) };
  }
}
