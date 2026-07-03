import { Inject, Injectable } from '@nestjs/common';
import {
  clampLimit,
  decodeCursor,
  ErrorCode,
  type ListQueryInput,
  type Page,
  type PostDto,
} from '@osia/shared';
import { AppException } from '../../../common/app-exception';
import { PROFILE_QUERY, type ProfileQueryPort } from '../ports/out/profile.query';
import { PostMediaSigner } from '../post-media-signer.service';

/** Posts de un perfil (S3.5-H1), visibles para el solicitante, por cursor keyset. 404 si el handle no existe. */
@Injectable()
export class ListProfilePostsUseCase {
  constructor(
    @Inject(PROFILE_QUERY) private readonly profiles: ProfileQueryPort,
    private readonly mediaSigner: PostMediaSigner,
  ) {}

  async execute(handle: string, viewerAccountId: string, query: ListQueryInput): Promise<Page<PostDto>> {
    const page = await this.profiles.listProfilePosts(
      handle,
      viewerAccountId,
      clampLimit(query.limit),
      query.cursor ? decodeCursor(query.cursor) : null,
    );
    if (!page) throw new AppException(ErrorCode.NOT_FOUND, 404, 'Perfil no encontrado.');
    await this.mediaSigner.signPosts(page.data);
    return page;
  }
}
