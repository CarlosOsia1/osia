import { Inject, Injectable } from '@nestjs/common';
import type { Pool } from 'pg';
import type { SocialMetricsDto } from '@osia/shared';
import { PG_POOL } from '../../../identity/infrastructure/postgres/postgres.tokens';
import type { MetricsQueryPort } from '../../application/ports/out/metrics.query';

type MetricsRow = {
  posts: string;
  reactions: string;
  comments: string;
  follows: string;
  posts_last_24h: string;
  feed_items: string;
};

/** Adapter de métricas sociales (S3.6-H3): conteos agregados en una sola ida. */
@Injectable()
export class PgMetricsQuery implements MetricsQueryPort {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async socialMetrics(): Promise<SocialMetricsDto> {
    const res = await this.pool.query<MetricsRow>(
      `SELECT
         (SELECT count(*) FROM social.posts WHERE deleted_at IS NULL) AS posts,
         (SELECT count(*) FROM social.reactions) AS reactions,
         (SELECT count(*) FROM social.comments WHERE deleted_at IS NULL) AS comments,
         (SELECT count(*) FROM social.follows WHERE status = 'active') AS follows,
         (SELECT count(*) FROM social.posts
            WHERE deleted_at IS NULL AND created_at > now() - interval '24 hours') AS posts_last_24h,
         (SELECT count(*) FROM social.feed_items) AS feed_items`,
    );
    const r = res.rows[0];
    return {
      posts: Number(r?.posts ?? 0),
      reactions: Number(r?.reactions ?? 0),
      comments: Number(r?.comments ?? 0),
      follows: Number(r?.follows ?? 0),
      postsLast24h: Number(r?.posts_last_24h ?? 0),
      feedItems: Number(r?.feed_items ?? 0),
    };
  }
}
