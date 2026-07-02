import {
  networkPresenceResponseSchema,
  presenceResponseSchema,
  type NetworkPresenceEntryDto,
  type PresenceEntryDto,
} from '@osia/shared';
import { apiCall } from './client';

/**
 * Presencia de cuentas (`GET /v1/presence?accountIds=…`); solo devuelve las que te siguen
 * (regla direccional S3.9). El servidor responde `{ presence: [...] }` — el cliente viejo lo
 * tipaba como array a pelo y la presencia del perfil nunca funcionó; el parse del contrato
 * (R1) hace imposible que esa divergencia vuelva a pasar callada.
 */
export async function getPresence(accountIds: string[]): Promise<PresenceEntryDto[]> {
  if (accountIds.length === 0) return [];
  const qs = `?accountIds=${encodeURIComponent(accountIds.join(','))}`;
  const { presence } = await apiCall(`/v1/presence${qs}`, presenceResponseSchema);
  return presence;
}

/** Quién de TU red está en El Mundo ahora (`GET /v1/presence/network`, R2 — rail del Salón). */
export async function getNetworkPresence(): Promise<NetworkPresenceEntryDto[]> {
  const { presence } = await apiCall('/v1/presence/network', networkPresenceResponseSchema);
  return presence;
}
