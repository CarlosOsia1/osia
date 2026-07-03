import type { Cursor, Page, ReactionActorDto, ReactionDto, ReactionKind } from '@osia/shared';
import type { Tx } from '../../../../common/tx';

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
  /** Upsert idempotente por `(post, account, kind)`. `null` si el post no existe o está borrado (→ 404).
   *  `tx` permite encolar el `social.post.reacted` en la misma transacción (outbox, Ola 1C). */
  setReaction(
    postId: string,
    accountId: string,
    kind: ReactionKind,
    tx?: Tx,
  ): Promise<SetReactionResult | null>;
  /** Borra la reacción (idempotente; sin error si no existía). El trigger ajusta `reaction_count`. */
  removeReaction(postId: string, accountId: string, kind: ReactionKind): Promise<void>;
  /** Quién reaccionó a un post (opcionalmente filtrado por `kind`), keyset. `null` si el post no es
   *  visible para el lector o no existe (→ 404/oculto). */
  listReactors(
    postId: string,
    viewerAccountId: string,
    kind: ReactionKind | null,
    limit: number,
    cursor: Cursor | null,
  ): Promise<Page<ReactionActorDto> | null>;
}
