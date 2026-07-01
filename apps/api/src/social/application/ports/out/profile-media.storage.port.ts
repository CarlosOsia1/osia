import type { ProfileMediaKind, UploadTargetDto } from '@osia/shared';

export const PROFILE_MEDIA_STORAGE = Symbol('PROFILE_MEDIA_STORAGE');

/**
 * Puerto de Storage para la media del PERFIL (S3.8): foto y portada. Igual filosofía que el de posts —
 * el API nunca recibe el binario: mintea un destino prefirmado (bucket `profile-media`). Puerto aparte
 * del de posts (bucket/ruta/mimes distintos), no una god-interface (§1.1-I).
 */
export interface ProfileMediaStoragePort {
  createUploadTarget(accountId: string, kind: ProfileMediaKind, contentType: string): Promise<UploadTargetDto>;
  /** ¿La URL pública es de NUESTRO bucket de perfil? Rechaza URLs externas al fijar photo/cover. */
  ownsPublicUrl(url: string): boolean;
}
