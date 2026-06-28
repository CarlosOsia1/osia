/**
 * GetPresenceUseCase (S3.4-H1) — delega (viewer, accountIds) al puerto de presencia. Fake del puerto.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { GetPresenceUseCase } from './get-presence.use-case';
import type { PresenceQueryPort } from '../ports/out/presence.query';

test('delega (viewer, accountIds) al puerto de presencia', async () => {
  const calls: Array<[string, string[]]> = [];
  const port: PresenceQueryPort = {
    getPresence: async (viewer, ids) => {
      calls.push([viewer, ids]);
      return [];
    },
  };
  const res = await new GetPresenceUseCase(port).execute('viewer-1', { accountIds: ['a', 'b'] });
  assert.deepEqual(res, []);
  assert.deepEqual(calls, [['viewer-1', ['a', 'b']]]);
});
