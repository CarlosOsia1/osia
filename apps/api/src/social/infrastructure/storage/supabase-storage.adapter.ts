import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { ErrorCode, type PostUploadMime, type UploadTargetDto } from '@osia/shared';
import { SUPABASE_ADMIN } from '../../../identity/infrastructure/supabase/supabase.tokens';
import { AppException } from '../../../common/app-exception';
import type { StoragePort } from '../../application/ports/out/storage.port';

/** Buckets públicos de adjuntos de post (migraciones `…storage_post_media` y `…social_post_video`). */
const IMAGE_BUCKET = 'post-media';
const VIDEO_BUCKET = 'post-video';

/** MIME → extensión + bucket destino. La ruta no expone el nombre original del archivo del usuario. */
const TARGET_BY_MIME: Record<PostUploadMime, { ext: string; bucket: string }> = {
  'image/png': { ext: 'png', bucket: IMAGE_BUCKET },
  'image/jpeg': { ext: 'jpg', bucket: IMAGE_BUCKET },
  'image/webp': { ext: 'webp', bucket: IMAGE_BUCKET },
  'image/gif': { ext: 'gif', bucket: IMAGE_BUCKET },
  'video/mp4': { ext: 'mp4', bucket: VIDEO_BUCKET },
  'video/webm': { ext: 'webm', bucket: VIDEO_BUCKET },
};

/**
 * Adapter de Storage sobre Supabase Storage (S3.3-H1; video en S3.10). Rutea imagen→`post-media` y
 * video→`post-video`. Usa el cliente `service_role` para mintear una URL de subida prefirmada: el cliente
 * sube DIRECTO, el API nunca toca el binario (docs/09). Buckets públicos de lectura; la escritura la
 * autoriza el token de la URL, no RLS de `authenticated`. `ownsPublicUrl` valida pertenencia a AMBOS.
 */
@Injectable()
export class SupabaseStorageAdapter implements StoragePort {
  /** Prefijos públicos por bucket, con barra final garantizada (evita que un bucket hermano pase). */
  private readonly publicPrefixes: string[];

  constructor(@Inject(SUPABASE_ADMIN) private readonly supabase: SupabaseClient) {
    this.publicPrefixes = [IMAGE_BUCKET, VIDEO_BUCKET].map((bucket) => {
      const base = this.supabase.storage.from(bucket).getPublicUrl('').data.publicUrl;
      return base.endsWith('/') ? base : `${base}/`;
    });
  }

  async createUploadTarget(accountId: string, contentType: string): Promise<UploadTargetDto> {
    const target = TARGET_BY_MIME[contentType as PostUploadMime];
    // Defensa de borde: el controller ya valida `contentType` contra la allowlist Zod; esto cubre
    // cualquier otra ruta de llamada sin asumir que el input vino saneado.
    if (!target) {
      throw new AppException(ErrorCode.VALIDATION_FAILED, 422, 'Tipo de adjunto no permitido.');
    }
    const path = `posts/${accountId}/${randomUUID()}.${target.ext}`;
    const { data, error } = await this.supabase.storage.from(target.bucket).createSignedUploadUrl(path);
    if (error || !data) {
      throw new AppException(
        ErrorCode.UPSTREAM_UNAVAILABLE,
        502,
        'No se pudo preparar la subida del adjunto.',
        { retryable: true },
      );
    }
    const publicUrl = this.supabase.storage.from(target.bucket).getPublicUrl(data.path).data.publicUrl;
    return { uploadUrl: data.signedUrl, publicUrl, path: data.path };
  }

  ownsPublicUrl(url: string): boolean {
    return this.publicPrefixes.some((prefix) => url.startsWith(prefix));
  }
}
