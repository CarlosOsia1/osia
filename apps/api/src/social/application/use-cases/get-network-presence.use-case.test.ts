import test from 'node:test';
import assert from 'node:assert/strict';
import type { NetworkPresenceEntryDto } from '@osia/shared';
import { GetNetworkPresenceUseCase, NETWORK_PRESENCE_LIMIT } from './get-network-presence.use-case';
import type { PresenceQueryPort } from '../ports/out/presence.query';

/** El use-case delega en el puerto con el tope fijo del rail (12) y devuelve tal cual. */
test('getNetworkPresence: delega con el límite del rail y no transforma', async () => {
  const calls: Array<{ viewer: string; limit: number }> = [];
  const entry = { accountId: 'a' } as unknown as NetworkPresenceEntryDto;
  const port: PresenceQueryPort = {
    getPresence: () => Promise.resolve([]),
    getNetworkPresence: (viewer, limit) => {
      calls.push({ viewer, limit });
      return Promise.resolve([entry]);
    },
  };
  const useCase = new GetNetworkPresenceUseCase(port);
  const result = await useCase.execute('viewer-1');
  assert.deepEqual(calls, [{ viewer: 'viewer-1', limit: NETWORK_PRESENCE_LIMIT }]);
  assert.equal(NETWORK_PRESENCE_LIMIT, 12);
  assert.deepEqual(result, [entry]);
});
