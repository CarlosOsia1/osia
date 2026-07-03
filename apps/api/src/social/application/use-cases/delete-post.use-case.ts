import { Inject, Injectable } from '@nestjs/common';
import { ErrorCode } from '@osia/shared';
import { AppException } from '../../../common/app-exception';
import { POST_REPOSITORY, type PostRepository } from '../ports/out/post.repository';
import { STORAGE_PORT, type StoragePort } from '../ports/out/storage.port';

/**
 * Borrar un post PROPIO (S3.10): soft-delete + retiro de los feeds + borrado de los objetos de media del
 * Storage (Ola 1D — "borré mi foto" ⇒ el binario se va). Solo el autor (el repo gatea por
 * `author_account_id`). 404 si no existe o no es tuyo (sin oráculo: no revela posts ajenos).
 */
@Injectable()
export class DeletePostUseCase {
  constructor(
    @Inject(POST_REPOSITORY) private readonly posts: PostRepository,
    @Inject(STORAGE_PORT) private readonly storage: StoragePort,
  ) {}

  async execute(postId: string, authorAccountId: string): Promise<void> {
    const mediaUrls = await this.posts.softDelete(postId, authorAccountId);
    if (mediaUrls === null) throw new AppException(ErrorCode.NOT_FOUND, 404, 'Publicación no encontrada.');
    // El post ya está soft-deleted; el borrado de los objetos es best-effort (el adapter absorbe fallos).
    if (mediaUrls.length > 0) await this.storage.deleteByUrls(mediaUrls);
  }
}
