import { Inject, Injectable } from '@nestjs/common';
import { ErrorCode, type CommentDto, type UpdateCommentInput } from '@osia/shared';
import { AppException } from '../../../common/app-exception';
import { COMMENT_REPOSITORY, type CommentRepository } from '../ports/out/comment.repository';

/**
 * Editar un comentario PROPIO (R4.1). El repo gatea por autor en la misma sentencia; 404 si no
 * existe, está borrado o no es tuyo (sin oráculo). Marca `edited_at`.
 */
@Injectable()
export class UpdateCommentUseCase {
  constructor(@Inject(COMMENT_REPOSITORY) private readonly comments: CommentRepository) {}

  async execute(commentId: string, accountId: string, input: UpdateCommentInput): Promise<CommentDto> {
    const comment = await this.comments.updateOwnComment(commentId, accountId, input.body);
    if (!comment) throw new AppException(ErrorCode.NOT_FOUND, 404, 'Comentario no encontrado.');
    return comment;
  }
}
