import { Inject, Injectable } from '@nestjs/common';
import { ErrorCode, parseMentions, type CommentDto, type CreateCommentInput } from '@osia/shared';
import { AppException } from '../../../common/app-exception';
import { COMMENT_REPOSITORY, type CommentRepository } from '../ports/out/comment.repository';
import {
  SOCIAL_EVENT_PUBLISHER,
  type SocialEventPublisher,
} from '../ports/out/social-event-publisher.port';

/**
 * Comentar un post (S3.3-H3 / S3.4). El cuerpo (1–1000) ya pasó Zod. El repo solo crea si el post es
 * VISIBLE para el autor y el `parentCommentId` (si viene) es del mismo post; si no, `null` → 404. Al
 * crearse emite `social.post.commented` con las menciones `@handle` resueltas (excluyendo al comentador
 * y al autor del post, que reciben su propio aviso), para que las notificaciones (S3.4) avisen a todos.
 */
@Injectable()
export class CreateCommentUseCase {
  constructor(
    @Inject(COMMENT_REPOSITORY) private readonly comments: CommentRepository,
    @Inject(SOCIAL_EVENT_PUBLISHER) private readonly events: SocialEventPublisher,
  ) {}

  async execute(
    postId: string,
    authorAccountId: string,
    input: CreateCommentInput,
  ): Promise<CommentDto> {
    const result = await this.comments.createComment(
      postId,
      authorAccountId,
      input.body,
      input.parentCommentId ?? null,
    );
    if (!result) {
      throw new AppException(ErrorCode.NOT_FOUND, 404, 'El post no existe o no puedes comentarlo.');
    }

    const handles = parseMentions(input.body);
    const mentioned = (handles.length > 0 ? await this.comments.resolveMentionedAccountIds(handles) : [])
      // El comentador y el autor del post no se notifican como "mención" (ya reciben lo suyo).
      .filter((id) => id !== authorAccountId && id !== result.postAuthorAccountId);

    this.events.postCommented({
      postId,
      postAuthorAccountId: result.postAuthorAccountId,
      commenterAccountId: authorAccountId,
      commentId: result.comment.id,
      mentionedAccountIds: mentioned,
    });
    return result.comment;
  }
}
