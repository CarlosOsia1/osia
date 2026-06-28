import type { ReactionDto, ReactionKind } from '@osia/shared';

export const REACTION_REPOSITORY = Symbol('REACTION_REPOSITORY');

export type SetReactionResult = {
  reaction: ReactionDto;
  /** Conteo desnormalizado vigente del post (tras el trigger). */
  reactionCount: number;
  /** Autor del post (receptor de la reputación). */
  postAuthorAccountId: string;
  /** `true` si la reacción es nueva (ese `kind` del lector no existía en el post). */
  created: boolean;
};

export interface ReactionRepository {
  /** Upsert idempotente por `(post, account, kind)`. `null` si el post no existe o está borrado (→ 404). */
  setReaction(postId: string, accountId: string, kind: ReactionKind): Promise<SetReactionResult | null>;
  /** Borra la reacción (idempotente; sin error si no existía). El trigger ajusta `reaction_count`. */
  removeReaction(postId: string, accountId: string, kind: ReactionKind): Promise<void>;
}
