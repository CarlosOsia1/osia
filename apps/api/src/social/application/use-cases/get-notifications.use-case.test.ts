/**
 * GetNotificationsUseCase (S3.4-H2) — combina la página + el contador de no-leídas en NotificationsPageDto,
 * clampea limit y decodifica cursor. Fake del repo.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { MAX_PAGE_LIMIT, type NotificationDto, type Page } from '@osia/shared';
import { GetNotificationsUseCase } from './get-notifications.use-case';
import type { NotificationRepository } from '../ports/out/notification.repository';

const ACCOUNT = '0190b8e0-7c1e-7b3a-8a4e-000000000001';
const page: Page<NotificationDto> = { data: [], page: { nextCursor: null, hasMore: false, limit: 20 } };

test('devuelve página + unreadCount; clampea limit y pasa unreadOnly', async () => {
  const seen: { limit: number; unreadOnly: boolean } = { limit: 0, unreadOnly: false };
  const repo: NotificationRepository = {
    create: async () => {},
    list: async (_acc, limit, _cursor, unreadOnly) => {
      seen.limit = limit;
      seen.unreadOnly = unreadOnly;
      return page;
    },
    unreadCount: async () => 7,
    markRead: async () => {},
    markOneRead: async () => true,
  };
  const res = await new GetNotificationsUseCase(repo).execute(ACCOUNT, { limit: 9999, unread: 'true' });
  assert.equal(res.unreadCount, 7);
  assert.deepEqual(res.data, []);
  assert.equal(seen.limit, MAX_PAGE_LIMIT);
  assert.equal(seen.unreadOnly, true);
});
