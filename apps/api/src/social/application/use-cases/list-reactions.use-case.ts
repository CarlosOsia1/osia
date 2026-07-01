import { Inject, Injectable } from '@nestjs/common';
import {
  clampLimit,
  decodeCursor,
  ErrorCode,
  type ListQueryInput,
  type Page,
  type ReactionActorDto,
  type ReactionKind,
} from '@osia/shared';
import { AppException } from '../../../common/app-exception';
import { REACTION_REPOSITORY, type ReactionRepository } from '../ports/out/reaction.repository';

/**
 * Quién reaccionó a un post (S3.10), paginado (keyset) y opcionalmente filtrado por `kind`. El repo
 * reimpone la visibilidad: si el lector no puede ver el post, es 404 (no revela reacciones de lo oculto).
 */
@Injectable()
export class ListReactionsUseCase {
  constructor(@Inject(REACTION_REPOSITORY) private readonly reactions: ReactionRepository) {}

  async execute(
    postId: string,
    viewerAccountId: string,
    kind: ReactionKind | null,
    query: ListQueryInput,
  ): Promise<Page<ReactionActorDto>> {
    const page = await this.reactions.listReactors(
      postId,
      viewerAccountId,
      kind,
      clampLimit(query.limit),
      query.cursor ? decodeCursor(query.cursor) : null,
    );
    if (!page) throw new AppException(ErrorCode.NOT_FOUND, 404, 'Publicación no encontrada.');
    return page;
  }
}
