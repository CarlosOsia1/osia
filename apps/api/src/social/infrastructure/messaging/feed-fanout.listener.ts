import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { SOCIAL_POST_PUBLISHED, type SocialPostPublishedPayload } from '@osia/shared';
import { FanOutPostUseCase } from '../../application/use-cases/fan-out-post.use-case';

/**
 * Adapter de entrada por eventos: traduce `social.post.published` al fan-out del feed (S3.3-H4). Como el
 * publicador usa `emit` (fire-and-forget), ABSORBE sus errores: el post ya está creado; un fallo del
 * fan-out no debe tumbar el proceso ni la publicación. (Una reconciliación/poda futura puede sanar.)
 */
@Injectable()
export class FeedFanoutListener {
  private readonly logger = new Logger(FeedFanoutListener.name);

  constructor(private readonly fanOut: FanOutPostUseCase) {}

  @OnEvent(SOCIAL_POST_PUBLISHED)
  async onPostPublished(payload: SocialPostPublishedPayload): Promise<void> {
    try {
      await this.fanOut.execute(payload);
    } catch (err) {
      this.logger.warn(
        `fan-out falló para post ${payload.postId}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
