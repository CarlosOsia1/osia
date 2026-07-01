import { Inject, Injectable } from '@nestjs/common';
import { ErrorCode, type CreatePostInput, type PostDto } from '@osia/shared';
import { AppException } from '../../../common/app-exception';
import { POST_REPOSITORY, type PostRepository } from '../ports/out/post.repository';
import { STORAGE_PORT, type StoragePort } from '../ports/out/storage.port';
import {
  SOCIAL_EVENT_PUBLISHER,
  type SocialEventPublisher,
} from '../ports/out/social-event-publisher.port';

/**
 * Publicar un Post (S3.3-H1/H4). El cuerpo/visibilidad ya pasaron Zod en el borde. Aquí se valida que
 * cada adjunto sea una URL de NUESTRO Storage (no una URL externa arbitraria) y luego se persiste. Al
 * crearse emite `social.post.published`, que el fan-out (S3.3-H4) consume para materializar el feed.
 */
@Injectable()
export class CreatePostUseCase {
  constructor(
    @Inject(POST_REPOSITORY) private readonly posts: PostRepository,
    @Inject(STORAGE_PORT) private readonly storage: StoragePort,
    @Inject(SOCIAL_EVENT_PUBLISHER) private readonly events: SocialEventPublisher,
  ) {}

  async execute(authorAccountId: string, input: CreatePostInput): Promise<PostDto> {
    for (const item of input.media ?? []) {
      if (!this.storage.ownsPublicUrl(item.url)) {
        throw new AppException(ErrorCode.VALIDATION_FAILED, 422, 'Un adjunto no pertenece a OSIA.', {
          details: [{ field: 'media', code: 'FOREIGN_MEDIA_URL', message: 'Adjunto externo no permitido.' }],
        });
      }
    }
    const post = await this.posts.createPost(authorAccountId, input);
    this.events.postPublished({ postId: post.id, authorAccountId, createdAt: post.createdAt });
    return post;
  }
}
