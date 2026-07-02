import { accountBriefDtoSchema, pageOf, type AccountBriefDto, type Page } from '@osia/shared';
import { apiCall, apiVoid, pageQs } from './client';

/** Control del propio espacio (R4.4): bloquear (corta relación) y silenciar (preferencia privada). */

/** Bloquea una cuenta (`PUT /v1/blocks/{accountId}`), idempotente. */
export function blockAccount(accountId: string): Promise<void> {
  return apiVoid(`/v1/blocks/${accountId}`, { method: 'PUT' });
}

/** Desbloquea (`DELETE /v1/blocks/{accountId}`), idempotente. No restaura follows. */
export function unblockAccount(accountId: string): Promise<void> {
  return apiVoid(`/v1/blocks/${accountId}`, { method: 'DELETE' });
}

/** Cuentas que YO bloqueé (`GET /v1/blocks`), keyset. */
export function getBlocked(cursor?: string): Promise<Page<AccountBriefDto>> {
  return apiCall(`/v1/blocks${pageQs(cursor)}`, pageOf(accountBriefDtoSchema));
}

/** Silencia una cuenta (`PUT /v1/mutes/{accountId}`), idempotente y discreto. */
export function muteAccount(accountId: string): Promise<void> {
  return apiVoid(`/v1/mutes/${accountId}`, { method: 'PUT' });
}

/** Quita el silencio (`DELETE /v1/mutes/{accountId}`), idempotente. */
export function unmuteAccount(accountId: string): Promise<void> {
  return apiVoid(`/v1/mutes/${accountId}`, { method: 'DELETE' });
}

/** Cuentas que YO silencié (`GET /v1/mutes`), keyset. */
export function getMuted(cursor?: string): Promise<Page<AccountBriefDto>> {
  return apiCall(`/v1/mutes${pageQs(cursor)}`, pageOf(accountBriefDtoSchema));
}
