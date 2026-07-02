import { Controller, Delete, Get, HttpCode, Param, Put, Query, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { listQuerySchema, type ListQueryInput, type Page, type PostDto } from '@osia/shared';
import { ZodValidationPipe } from '../../common/zod-validation.pipe';
import { AuthGuard, CurrentAccount, type AccountContext } from '../../common/auth.guard';
import { EmailVerifiedGuard } from '../../common/email-verified.guard';
import {
  ListBookmarksUseCase,
  RemoveBookmarkUseCase,
  SetBookmarkUseCase,
} from '../application/use-cases/bookmark.use-cases';

const postIdParam = new ZodValidationPipe(z.string().uuid());

/**
 * Guardados (R4.2): `PUT/DELETE /v1/posts/{id}/bookmark` (idempotentes) y `GET /v1/bookmarks`
 * (keyset, por recencia del guardado). Colección PRIVADA del lector. AuthGuard en todo;
 * escrituras exigen email verificado.
 */
@Controller()
@UseGuards(AuthGuard)
export class BookmarkController {
  constructor(
    private readonly setBookmark: SetBookmarkUseCase,
    private readonly removeBookmark: RemoveBookmarkUseCase,
    private readonly listBookmarks: ListBookmarksUseCase,
  ) {}

  @Put('posts/:id/bookmark')
  @HttpCode(204)
  @UseGuards(EmailVerifiedGuard)
  async save(
    @CurrentAccount() account: AccountContext,
    @Param('id', postIdParam) id: string,
  ): Promise<void> {
    await this.setBookmark.execute(account.accountId, id);
  }

  @Delete('posts/:id/bookmark')
  @HttpCode(204)
  @UseGuards(EmailVerifiedGuard)
  async remove(
    @CurrentAccount() account: AccountContext,
    @Param('id', postIdParam) id: string,
  ): Promise<void> {
    await this.removeBookmark.execute(account.accountId, id);
  }

  @Get('bookmarks')
  list(
    @CurrentAccount() account: AccountContext,
    @Query(new ZodValidationPipe(listQuerySchema)) query: ListQueryInput,
  ): Promise<Page<PostDto>> {
    return this.listBookmarks.execute(account.accountId, query);
  }
}
