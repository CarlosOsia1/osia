import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { SOCIAL_POST_PUBLISHED, type SocialPostPublishedPayload } from '@osia/shared';
import { FanOutPostUseCase } from '../../application/use-cases/fan-out-post.use-case';

/**
 * Adapter de entrada por eventos: traduce `social.post.published` al fan-out del feed (S3.3-H4). El evento
 * llega por el OUTBOX (Ola 1C): NO se traga el error — se propaga para que el dispatcher reintente. El
 * fan-out es idempotente (`ON CONFLICT`), así que un reintento no duplica el post en los feeds.
 */
@Injectable()
export class FeedFanoutListener {
  constructor(private readonly fanOut: FanOutPostUseCase) {}

  @OnEvent(SOCIAL_POST_PUBLISHED)
  async onPostPublished(payload: SocialPostPublishedPayload): Promise<void> {
    await this.fanOut.execute(payload);
  }
}
