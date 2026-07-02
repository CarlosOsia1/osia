import { feedItemDtoSchema, pageOf, type FeedItemDto, type Page } from '@osia/shared';
import { apiCall, pageQs } from './client';

/** Lee una página del feed propio (`GET /v1/feed`), cronológico inverso por cursor. */
export function getFeed(cursor?: string): Promise<Page<FeedItemDto>> {
  return apiCall(`/v1/feed${pageQs(cursor)}`, pageOf(feedItemDtoSchema));
}
