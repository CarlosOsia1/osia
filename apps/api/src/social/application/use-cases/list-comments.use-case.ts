import { Inject, Injectable } from '@nestjs/common';
import {
  clampLimit,
  decodeCursor,
  ErrorCode,
  type CommentDto,
  type ListQueryInput,
  type Page,
} from '@osia/shared';
import { AppException } from '../../../common/app-exception';
import { COMMENT_REPOSITORY, type CommentRepository } from '../ports/out/comment.repository';

/**
 * Listar comentarios de un post (S3.3-H3), cronológico ASC por cursor keyset. 404 si el post no existe
 * o no es visible para el lector (no se filtran comentarios de contenido ajeno).
 */
@Injectable()
export class ListCommentsUseCase {
  constructor(@Inject(COMMENT_REPOSITORY) private readonly comments: CommentRepository) {}

  async execute(
    postId: string,
    viewerAccountId: string,
    query: ListQueryInput,
  ): Promise<Page<CommentDto>> {
    const page = await this.comments.listComments(
      postId,
      viewerAccountId,
      clampLimit(query.limit),
      query.cursor ? decodeCursor(query.cursor) : null,
    );
    if (!page) throw new AppException(ErrorCode.NOT_FOUND, 404, 'El post no existe o no puedes verlo.');
    return page;
  }
}
