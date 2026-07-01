import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { ErrorCode, type ProfileMediaKind, type ProfileMediaMime, type UploadTargetDto } from '@osia/shared';
import { SUPABASE_ADMIN } from '../../../identity/infrastructure/supabase/supabase.tokens';
import { AppException } from '../../../common/app-exception';
import type { ProfileMediaStoragePort } from '../../application/ports/out/profile-media.storage.port';

/** Bucket público de media de perfil (creado por `20260701000002_storage_profile_media`). */
const BUCKET = 'profile-media';

const EXT_BY_MIME: Record<ProfileMediaMime, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

/**
 * Adapter de Storage para foto/portada (S3.8), espejo del de posts pero sobre `profile-media`. La ruta
 * queda scoped por cuenta y tipo (`profiles/{accountId}/{kind}-{uuid}.{ext}`); el cliente sube DIRECTO por
 * la URL prefirmada. Bucket público de lectura; la escritura solo por el token de la URL.
 */
@Injectable()
export class SupabaseProfileMediaAdapter implements ProfileMediaStoragePort {
  private readonly publicPrefix: string;

  constructor(@Inject(SUPABASE_ADMIN) private readonly supabase: SupabaseClient) {
    const base = this.supabase.storage.from(BUCKET).getPublicUrl('').data.publicUrl;
    this.publicPrefix = base.endsWith('/') ? base : `${base}/`;
  }

  async createUploadTarget(
    accountId: string,
    kind: ProfileMediaKind,
    contentType: string,
  ): Promise<UploadTargetDto> {
    const ext = EXT_BY_MIME[contentType as ProfileMediaMime];
    if (!ext) {
      throw new AppException(ErrorCode.VALIDATION_FAILED, 422, 'Tipo de imagen no permitido.');
    }
    const path = `profiles/${accountId}/${kind}-${randomUUID()}.${ext}`;
    const { data, error } = await this.supabase.storage.from(BUCKET).createSignedUploadUrl(path);
    if (error || !data) {
      throw new AppException(ErrorCode.UPSTREAM_UNAVAILABLE, 502, 'No se pudo preparar la subida.', {
        retryable: true,
      });
    }
    const publicUrl = this.supabase.storage.from(BUCKET).getPublicUrl(data.path).data.publicUrl;
    return { uploadUrl: data.signedUrl, publicUrl, path: data.path };
  }

  ownsPublicUrl(url: string): boolean {
    return url.startsWith(this.publicPrefix);
  }
}
