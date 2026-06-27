import type { ProfileBrief, ProfileDto, UpdateProfileInput } from '@osia/shared';

export const PROFILE_REPOSITORY = Symbol('PROFILE_REPOSITORY');

export interface ProfileRepository {
  /** Perfil propio (vista privada). `null` si no existe. */
  getMine(accountId: string): Promise<ProfileDto | null>;
  /** Vista pública por handle (respeta `privacy`/RLS en capas superiores). `null` si no existe. */
  getPublicByHandle(handle: string): Promise<ProfileBrief | null>;
  /** Edición parcial; devuelve el perfil resultante. */
  update(accountId: string, patch: UpdateProfileInput): Promise<ProfileDto>;
}
