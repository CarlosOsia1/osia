import { Inject, Injectable } from '@nestjs/common';
import { ErrorCode, type PostDto, type UpdatePostInput } from '@osia/shared';
import { AppException } from '../../../common/app-exception';
import { POST_REPOSITORY, type PostRepository } from '../ports/out/post.repository';
import { PostMediaSigner } from '../post-media-signer.service';

/**
 * Editar un post PROPIO (R4.1): solo el cuerpo (la visibilidad no se toca — el fan-out ya
 * ocurrió; la media tampoco). El repo gatea por autor en la misma sentencia; 404 si no existe
 * o no es tuyo (sin oráculo). Marca `edited_at` — la UI pinta «editado».
 */
@Injectable()
export class UpdatePostUseCase {
  constructor(
    @Inject(POST_REPOSITORY) private readonly posts: PostRepository,
    private readonly mediaSigner: PostMediaSigner,
  ) {}

  async execute(postId: string, authorAccountId: string, input: UpdatePostInput): Promise<PostDto> {
    const post = await this.posts.updateBody(postId, authorAccountId, input.body);
    if (!post) throw new AppException(ErrorCode.NOT_FOUND, 404, 'Publicación no encontrada.');
    await this.mediaSigner.signPost(post);
    return post;
  }
}
