import { Inject, Injectable } from '@nestjs/common';
import { ErrorCode, type CreateEchoInput, type PostDto } from '@osia/shared';
import { AppException } from '../../../common/app-exception';
import { TX_RUNNER, type TxRunner } from '../../../common/tx';
import { POST_REPOSITORY, type PostRepository } from '../ports/out/post.repository';
import {
  SOCIAL_EVENT_PUBLISHER,
  type SocialEventPublisher,
} from '../ports/out/social-event-publisher.port';
import { PostMediaSigner } from '../post-media-signer.service';

/**
 * Eco (R4.3): amplificar un post ajeno hacia tu propio feed. El repo impone atómicamente que el
 * original esté vivo, sea PÚBLICO y su cuenta NO privada (404 si no — sin oráculo). Un eco NUEVO
 * emite `social.post.published` (fan-out a tus seguidores, riel existente) + `social.post.echoed`
 * (notificación al autor del original). El eco simple repetido es idempotente y NO re-emite.
 * SIN reputación (anti-grind, decisión de Carlos).
 */
@Injectable()
export class CreateEchoUseCase {
  constructor(
    @Inject(POST_REPOSITORY) private readonly posts: PostRepository,
    @Inject(SOCIAL_EVENT_PUBLISHER) private readonly events: SocialEventPublisher,
    @Inject(TX_RUNNER) private readonly tx: TxRunner,
    private readonly mediaSigner: PostMediaSigner,
  ) {}

  async execute(accountId: string, originalPostId: string, input: CreateEchoInput): Promise<PostDto> {
    // El eco y sus dos eventos (fan-out del eco + aviso al autor del original) van en una transacción;
    // solo se encolan si el eco es NUEVO (el eco simple repetido es idempotente y no re-emite).
    const result = await this.tx.run(async (tx) => {
      const echo = await this.posts.createEcho(accountId, originalPostId, input.body ?? null, tx);
      if (echo?.created) {
        await this.events.postPublished(tx, {
          postId: echo.echo.id,
          authorAccountId: accountId,
          createdAt: echo.echo.createdAt,
        });
        await this.events.postEchoed(tx, {
          echoPostId: echo.echo.id,
          originalPostId: echo.originalPostId,
          originalAuthorAccountId: echo.originalAuthorAccountId,
          echoAuthorAccountId: accountId,
        });
      }
      return echo;
    });
    if (!result) throw new AppException(ErrorCode.NOT_FOUND, 404, 'Publicación no encontrada.');
    // El eco embebe el original: firma su media (directa + `referencedPost`) para el bucket privado.
    await this.mediaSigner.signPost(result.echo);
    return result.echo;
  }
}

@Injectable()
export class RemoveEchoUseCase {
  constructor(@Inject(POST_REPOSITORY) private readonly posts: PostRepository) {}

  /** Des-ecoar (idempotente): quitar el eco SIMPLE propio del post dado. */
  async execute(accountId: string, originalPostId: string): Promise<void> {
    await this.posts.removeSimpleEcho(accountId, originalPostId);
  }
}
