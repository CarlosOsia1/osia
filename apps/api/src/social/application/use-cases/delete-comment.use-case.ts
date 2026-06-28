import { Inject, Injectable } from '@nestjs/common';
import { ErrorCode } from '@osia/shared';
import { AppException } from '../../../common/app-exception';
import { COMMENT_REPOSITORY, type CommentRepository } from '../ports/out/comment.repository';

/**
 * Borrar (soft-delete) un comentario PROPIO (S3.3-H3). Solo el autor del comentario puede; si no existe,
 * no es suyo o ya estaba borrado, el repo devuelve `false` → 404 (sin revelar existencia ajena).
 */
@Injectable()
export class DeleteCommentUseCase {
  constructor(@Inject(COMMENT_REPOSITORY) private readonly comments: CommentRepository) {}

  async execute(commentId: string, accountId: string): Promise<void> {
    const deleted = await this.comments.softDeleteOwnComment(commentId, accountId);
    if (!deleted) throw new AppException(ErrorCode.NOT_FOUND, 404, 'Comentario no encontrado.');
  }
}
