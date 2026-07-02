import { profileSummariesResponseSchema, type ProfileSummaryDto } from '@osia/shared';
import { apiCall } from './client';

/** Descubrimiento de personas (S3.11): búsqueda por prefijo y sugerencias sin IA/ML. */

/** Buscar personas por prefijo (`GET /v1/search/profiles?q=`). */
export function searchProfiles(q: string): Promise<ProfileSummaryDto[]> {
  return apiCall(`/v1/search/profiles?q=${encodeURIComponent(q)}`, profileSummariesResponseSchema);
}

/** Sugeridos a seguir (`GET /v1/discover`), sin IA/ML. */
export function getSuggestions(): Promise<ProfileSummaryDto[]> {
  return apiCall('/v1/discover', profileSummariesResponseSchema);
}
