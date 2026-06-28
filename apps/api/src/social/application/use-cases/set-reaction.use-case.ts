import { Inject, Injectable } from '@nestjs/common';
import { ErrorCode, type ReactionKind, type ReactionResult } from '@osia/shared';
import { AppException } from '../../../common/app-exception';
import { REACTION_REPOSITORY, type ReactionRepository } from '../ports/out/reaction.repository';
import {
  SOCIAL_EVENT_PUBLISHER,
  type SocialEventPublisher,
} from '../ports/out/social-event-publisher.port';

/**
 * Reaccionar a un post (S3.3-H2). PUT idempotente: re-reaccionar con el mismo `kind` no duplica
 * (`uq_reactions`) ni re-emite. 404 si el post no existe. Al nacer una reacción NUEVA emite
 * `social.post.reacted`, que la reputación consume para acreditar al autor (una vez por post+reactor) y,
 * más adelante, la notificación (S3.4).
 */
@Injectable()
export class SetReactionUseCase {
  constructor(
    @Inject(REACTION_REPOSITORY) private readonly reactions: ReactionRepository,
    @Inject(SOCIAL_EVENT_PUBLISHER) private readonly events: SocialEventPublisher,
  ) {}

  async execute(postId: string, accountId: string, kind: ReactionKind): Promise<ReactionResult> {
    const result = await this.reactions.setReaction(postId, accountId, kind);
    if (!result) throw new AppException(ErrorCode.NOT_FOUND, 404, 'El post no existe.');
    if (result.created) {
      this.events.postReacted({
        postId,
        postAuthorAccountId: result.postAuthorAccountId,
        reactorAccountId: accountId,
        kind,
      });
    }
    return { reaction: result.reaction, reactionCount: result.reactionCount };
  }
}
