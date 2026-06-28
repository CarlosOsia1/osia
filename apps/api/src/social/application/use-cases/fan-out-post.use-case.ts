import { Inject, Injectable } from '@nestjs/common';
import type { SocialPostPublishedPayload } from '@osia/shared';
import { FEED_REPOSITORY, type FeedRepository } from '../ports/out/feed.repository';

/**
 * Fan-out-on-write (S3.3-H4): al publicarse un post, materializa `feed_items` para el autor y sus
 * seguidores. Consume `social.post.published` (vía el listener). Válido para pocos usuarios; el umbral
 * para migrar a fan-out-on-read se documenta en el backlog.
 */
@Injectable()
export class FanOutPostUseCase {
  constructor(@Inject(FEED_REPOSITORY) private readonly feed: FeedRepository) {}

  execute(payload: SocialPostPublishedPayload): Promise<number> {
    return this.feed.fanOutPost(payload.postId, payload.authorAccountId, payload.createdAt);
  }
}
