import { Inject, Injectable } from '@nestjs/common';
import { ErrorCode, type CommentDto, type CreateCommentInput } from '@osia/shared';
import { AppException } from '../../../common/app-exception';
import { COMMENT_REPOSITORY, type CommentRepository } from '../ports/out/comment.repository';

/**
 * Comentar un post (S3.3-H3). El cuerpo (1–1000) ya pasó Zod en el borde. El repo solo crea si el post
 * es VISIBLE para el autor y el `parentCommentId` (si viene) es del mismo post; si no, `null` → 404. La
 * emisión de `social.post.commented` y la detección de menciones llegan en S3.4 (su consumidor son las
 * notificaciones; regla de slice §1.2).
 */
@Injectable()
export class CreateCommentUseCase {
  constructor(@Inject(COMMENT_REPOSITORY) private readonly comments: CommentRepository) {}

  async execute(
    postId: string,
    authorAccountId: string,
    input: CreateCommentInput,
  ): Promise<CommentDto> {
    const comment = await this.comments.createComment(
      postId,
      authorAccountId,
      input.body,
      input.parentCommentId ?? null,
    );
    if (!comment) {
      throw new AppException(ErrorCode.NOT_FOUND, 404, 'El post no existe o no puedes comentarlo.');
    }
    return comment;
  }
}
