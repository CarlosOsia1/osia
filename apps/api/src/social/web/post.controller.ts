import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import {
  createEchoSchema,
  createPostSchema,
  updatePostSchema,
  type CreateEchoInput,
  type CreatePostInput,
  type PostDto,
  type UpdatePostInput,
} from '@osia/shared';
import { ZodValidationPipe } from '../../common/zod-validation.pipe';
import { AuthGuard, CurrentAccount, type AccountContext } from '../../common/auth.guard';
import { EmailVerifiedGuard } from '../../common/email-verified.guard';
import { CreatePostUseCase } from '../application/use-cases/create-post.use-case';
import { GetPostUseCase } from '../application/use-cases/get-post.use-case';
import { DeletePostUseCase } from '../application/use-cases/delete-post.use-case';
import { UpdatePostUseCase } from '../application/use-cases/update-post.use-case';
import { CreateEchoUseCase, RemoveEchoUseCase } from '../application/use-cases/echo.use-cases';

const postIdParam = new ZodValidationPipe(z.string().uuid());

/**
 * Posts (S3.3-H1; detalle/borrado en S3.10; editar en R4): publicar, ver un post por id
 * (deep-link, respeta visibilidad), editar el cuerpo propio y borrar el propio (soft-delete).
 * Protegido (AuthGuard) + rate-limit global por IP; escrituras exigen email verificado.
 */
@Controller('posts')
@UseGuards(AuthGuard)
export class PostController {
  constructor(
    private readonly createPost: CreatePostUseCase,
    private readonly getPost: GetPostUseCase,
    private readonly deletePost: DeletePostUseCase,
    private readonly updatePost: UpdatePostUseCase,
    private readonly createEcho: CreateEchoUseCase,
    private readonly removeEcho: RemoveEchoUseCase,
  ) {}

  @Post(':id/echo')
  @UseGuards(EmailVerifiedGuard)
  async echo(
    @CurrentAccount() account: AccountContext,
    @Param('id', postIdParam) id: string,
    @Body(new ZodValidationPipe(createEchoSchema)) body: CreateEchoInput,
  ): Promise<{ post: PostDto }> {
    return { post: await this.createEcho.execute(account.accountId, id, body) };
  }

  @Delete(':id/echo')
  @HttpCode(204)
  @UseGuards(EmailVerifiedGuard)
  async unecho(
    @CurrentAccount() account: AccountContext,
    @Param('id', postIdParam) id: string,
  ): Promise<void> {
    await this.removeEcho.execute(account.accountId, id);
  }

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

  @Patch(':id')
  @UseGuards(EmailVerifiedGuard)
  async update(
    @CurrentAccount() account: AccountContext,
    @Param('id', postIdParam) id: string,
    @Body(new ZodValidationPipe(updatePostSchema)) body: UpdatePostInput,
  ): Promise<{ post: PostDto }> {
    return { post: await this.updatePost.execute(id, account.accountId, body) };
  }

  @Delete(':id')
  @HttpCode(204)
  @UseGuards(EmailVerifiedGuard)
  async remove(
    @CurrentAccount() account: AccountContext,
    @Param('id', postIdParam) id: string,
  ): Promise<void> {
    await this.deletePost.execute(id, account.accountId);
  }
}
