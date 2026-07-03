import { Inject, Injectable } from '@nestjs/common';
import { ErrorCode, type PostDto } from '@osia/shared';
import { AppException } from '../../../common/app-exception';
import { POST_REPOSITORY, type PostRepository } from '../ports/out/post.repository';
import { PostMediaSigner } from '../post-media-signer.service';

/**
 * Detalle de un post (S3.10): destino de deep-links / compartir. El repo REIMPONE la visibilidad; un post
 * que el lector no puede ver se trata como inexistente (404/oculto): sin oráculo de existencia.
 */
@Injectable()
export class GetPostUseCase {
  constructor(
    @Inject(POST_REPOSITORY) private readonly posts: PostRepository,
    private readonly mediaSigner: PostMediaSigner,
  ) {}

  async execute(postId: string, viewerAccountId: string): Promise<PostDto> {
    const post = await this.posts.getById(postId, viewerAccountId);
    if (!post) throw new AppException(ErrorCode.NOT_FOUND, 404, 'Publicación no encontrada.');
    await this.mediaSigner.signPost(post);
    return post;
  }
}
