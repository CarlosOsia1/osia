import type { AvatarDto, UpdateAvatarInput } from '@osia/shared';

export const AVATAR_REPOSITORY = Symbol('AVATAR_REPOSITORY');

export interface AvatarRepository {
  /** Avatar activo del residente (`null` si no tiene). */
  getActive(accountId: string): Promise<AvatarDto | null>;
  /** Mezcla la config (jsonb) del avatar activo y devuelve el resultante. */
  updateActiveConfig(accountId: string, patch: UpdateAvatarInput): Promise<AvatarDto>;
}
