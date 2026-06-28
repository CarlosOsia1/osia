import { Inject, Injectable } from '@nestjs/common';
import type { ReactionKind } from '@osia/shared';
import { REACTION_REPOSITORY, type ReactionRepository } from '../ports/out/reaction.repository';

/**
 * Quitar una reacción (S3.3-H2). DELETE idempotente: si no había esa reacción, no es error (204 igual).
 * No revierte reputación (decisión: la reputación ganada no se quita), por eso no emite ningún evento.
 */
@Injectable()
export class RemoveReactionUseCase {
  constructor(@Inject(REACTION_REPOSITORY) private readonly reactions: ReactionRepository) {}

  execute(postId: string, accountId: string, kind: ReactionKind): Promise<void> {
    return this.reactions.removeReaction(postId, accountId, kind);
  }
}
