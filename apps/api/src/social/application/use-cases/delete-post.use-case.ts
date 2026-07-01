import { Inject, Injectable } from '@nestjs/common';
import { ErrorCode } from '@osia/shared';
import { AppException } from '../../../common/app-exception';
import { POST_REPOSITORY, type PostRepository } from '../ports/out/post.repository';

/**
 * Borrar un post PROPIO (S3.10): soft-delete + retiro de los feeds. Solo el autor (el repo gatea por
 * `author_account_id`). 404 si no existe o no es tuyo (sin oráculo: no revela posts ajenos).
 */
@Injectable()
export class DeletePostUseCase {
  constructor(@Inject(POST_REPOSITORY) private readonly posts: PostRepository) {}

  async execute(postId: string, authorAccountId: string): Promise<void> {
    const deleted = await this.posts.softDelete(postId, authorAccountId);
    if (!deleted) throw new AppException(ErrorCode.NOT_FOUND, 404, 'Publicación no encontrada.');
  }
}
