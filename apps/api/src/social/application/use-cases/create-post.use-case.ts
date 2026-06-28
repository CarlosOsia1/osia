import { Inject, Injectable } from '@nestjs/common';
import { ErrorCode, type CreatePostInput, type PostDto } from '@osia/shared';
import { AppException } from '../../../common/app-exception';
import { POST_REPOSITORY, type PostRepository } from '../ports/out/post.repository';
import { STORAGE_PORT, type StoragePort } from '../ports/out/storage.port';

/**
 * Publicar un Post (S3.3-H1). El cuerpo/visibilidad ya pasaron Zod en el borde. Aquí se valida que
 * cada adjunto sea una URL de NUESTRO Storage (no una URL externa arbitraria inyectada por el cliente)
 * y luego se persiste. La emisión de `social.post.published` (fan-out al feed) llega en S3.3-H4, donde
 * existe su consumidor (regla de slice §1.2).
 */
@Injectable()
export class CreatePostUseCase {
  constructor(
    @Inject(POST_REPOSITORY) private readonly posts: PostRepository,
    @Inject(STORAGE_PORT) private readonly storage: StoragePort,
  ) {}

  async execute(authorAccountId: string, input: CreatePostInput): Promise<PostDto> {
    for (const url of input.media ?? []) {
      if (!this.storage.ownsPublicUrl(url)) {
        throw new AppException(ErrorCode.VALIDATION_FAILED, 422, 'Un adjunto no pertenece a OSIA.', {
          details: [{ field: 'media', code: 'FOREIGN_MEDIA_URL', message: 'Adjunto externo no permitido.' }],
        });
      }
    }
    return this.posts.createPost(authorAccountId, input);
  }
}
