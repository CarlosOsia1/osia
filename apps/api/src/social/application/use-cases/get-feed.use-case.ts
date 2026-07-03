import { Inject, Injectable } from '@nestjs/common';
import {
  clampLimit,
  decodeCursor,
  type FeedItemDto,
  type ListQueryInput,
  type Page,
} from '@osia/shared';
import { FEED_REPOSITORY, type FeedRepository } from '../ports/out/feed.repository';
import { PostMediaSigner } from '../post-media-signer.service';

/**
 * Leer el feed propio (S3.3-H4): cronológico inverso por cursor keyset sobre la partición del lector.
 * Cada ítem trae el post embebido (autor brief + contadores + reacción del lector).
 */
@Injectable()
export class GetFeedUseCase {
  constructor(
    @Inject(FEED_REPOSITORY) private readonly feed: FeedRepository,
    private readonly mediaSigner: PostMediaSigner,
  ) {}

  async execute(accountId: string, query: ListQueryInput): Promise<Page<FeedItemDto>> {
    const page = await this.feed.getFeed(
      accountId,
      clampLimit(query.limit),
      query.cursor ? decodeCursor(query.cursor) : null,
    );
    await this.mediaSigner.signPosts(page.data.map((item) => item.post));
    return page;
  }
}
