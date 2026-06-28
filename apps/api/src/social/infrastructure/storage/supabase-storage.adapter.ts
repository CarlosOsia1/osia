import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { ErrorCode, type PostMediaMime, type UploadTargetDto } from '@osia/shared';
import { SUPABASE_ADMIN } from '../../../identity/infrastructure/supabase/supabase.tokens';
import { AppException } from '../../../common/app-exception';
import type { StoragePort } from '../../application/ports/out/storage.port';

/** Bucket público de adjuntos de post (creado por migración `20260628000004_storage_post_media`). */
const BUCKET = 'post-media';

/** Extensión del objeto por MIME (la ruta no expone el nombre original del archivo del usuario). */
const EXT_BY_MIME: Record<PostMediaMime, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

/**
 * Adapter de Storage sobre Supabase Storage (S3.3-H1). Usa el cliente `service_role` (server-side) para
 * mintear una URL de subida prefirmada: el cliente sube DIRECTO, el API nunca toca el binario (docs/09).
 * El bucket es público de lectura; la escritura la autoriza el token de la URL, no RLS de `authenticated`.
 */
@Injectable()
export class SupabaseStorageAdapter implements StoragePort {
  /** Prefijo público del bucket, calculado una vez (`…/object/public/post-media/`). */
  private readonly publicPrefix: string;

  constructor(@Inject(SUPABASE_ADMIN) private readonly supabase: SupabaseClient) {
    // Barra final GARANTIZADA: `ownsPublicUrl` valida pertenencia por `startsWith`, así que el prefijo NO
    // debe depender de que storage-js incluya la barra. Sin ella, un bucket hermano cuyo nombre empiece
    // con 'post-media' (p.ej. 'post-media-x') pasaría el chequeo. La forzamos aquí, no la asumimos.
    const base = this.supabase.storage.from(BUCKET).getPublicUrl('').data.publicUrl;
    this.publicPrefix = base.endsWith('/') ? base : `${base}/`;
  }

  async createUploadTarget(accountId: string, contentType: string): Promise<UploadTargetDto> {
    const ext = EXT_BY_MIME[contentType as PostMediaMime];
    // Defensa de borde: el controller ya valida `contentType` contra la allowlist Zod; esto cubre
    // cualquier otra ruta de llamada sin asumir que el input vino saneado.
    if (!ext) {
      throw new AppException(ErrorCode.VALIDATION_FAILED, 422, 'Tipo de adjunto no permitido.');
    }
    const path = `posts/${accountId}/${randomUUID()}.${ext}`;
    const { data, error } = await this.supabase.storage.from(BUCKET).createSignedUploadUrl(path);
    if (error || !data) {
      throw new AppException(
        ErrorCode.UPSTREAM_UNAVAILABLE,
        502,
        'No se pudo preparar la subida del adjunto.',
        { retryable: true },
      );
    }
    const publicUrl = this.supabase.storage.from(BUCKET).getPublicUrl(data.path).data.publicUrl;
    return { uploadUrl: data.signedUrl, publicUrl, path: data.path };
  }

  ownsPublicUrl(url: string): boolean {
    return url.startsWith(this.publicPrefix);
  }
}
