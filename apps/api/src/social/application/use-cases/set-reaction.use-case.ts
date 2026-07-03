import { Inject, Injectable } from '@nestjs/common';
import { ErrorCode, type ReactionKind, type ReactionResult } from '@osia/shared';
import { AppException } from '../../../common/app-exception';
import { TX_RUNNER, type TxRunner } from '../../../common/tx';
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
    @Inject(TX_RUNNER) private readonly tx: TxRunner,
  ) {}

  async execute(postId: string, accountId: string, kind: ReactionKind): Promise<ReactionResult> {
    // La reacción y su `social.post.reacted` (reputación al autor + notificación) van en una sola
    // transacción; el evento solo se encola si nació una reacción NUEVA (no en el re-PUT idempotente).
    const result = await this.tx.run(async (tx) => {
      const r = await this.reactions.setReaction(postId, accountId, kind, tx);
      if (r?.created) {
        await this.events.postReacted(tx, {
          postId,
          postAuthorAccountId: r.postAuthorAccountId,
          reactorAccountId: accountId,
          kind,
        });
      }
      return r;
    });
    if (!result) throw new AppException(ErrorCode.NOT_FOUND, 404, 'El post no existe.');
    return { reaction: result.reaction, reactionCount: result.reactionCount };
  }
}
