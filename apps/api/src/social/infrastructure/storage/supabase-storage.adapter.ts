import { Inject, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { ErrorCode, type PostUploadMime, type UploadTargetDto } from '@osia/shared';
import { SUPABASE_ADMIN } from '../../../identity/infrastructure/supabase/supabase.tokens';
import { AppException } from '../../../common/app-exception';
import type { StoragePort } from '../../application/ports/out/storage.port';

/** Buckets de adjuntos de post (privados desde Ola 1D; la media se sirve por URL firmada). */
const IMAGE_BUCKET = 'post-media';
const VIDEO_BUCKET = 'post-video';
const POST_BUCKETS = [IMAGE_BUCKET, VIDEO_BUCKET];

/** TTL de las URLs firmadas de media (7 días): holgado para sobrevivir a la caché del cliente entre
 *  refetches; como el API re-firma en cada lectura, un refetch siempre trae URLs frescas. */
const SIGN_TTL_S = 60 * 60 * 24 * 7;

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
 * Adapter de Storage sobre Supabase Storage (S3.3-H1; video en S3.10; privacidad en Ola 1D). Rutea
 * imagen→`post-media` y video→`post-video`. Usa el cliente `service_role` para mintear una URL de subida
 * prefirmada: el cliente sube DIRECTO, el API nunca toca el binario (docs/09). Los buckets son PRIVADOS:
 * la lectura se sirve por URL firmada (`signMediaUrls`), así que solo quien pasó la visibilidad del post
 * recibe una URL utilizable. El valor guardado en `posts.media` sigue siendo la URL con formato «público»
 * (un localizador estable del objeto); `signMediaUrls`/`deleteByUrls` extraen de ahí el bucket+ruta.
 */
@Injectable()
export class SupabaseStorageAdapter implements StoragePort {
  private readonly logger = new Logger(SupabaseStorageAdapter.name);
  /** Por bucket: el prefijo de URL «pública» (con barra final) del que se deriva la ruta del objeto. */
  private readonly buckets: { bucket: string; prefix: string }[];

  constructor(@Inject(SUPABASE_ADMIN) private readonly supabase: SupabaseClient) {
    this.buckets = POST_BUCKETS.map((bucket) => {
      const base = this.supabase.storage.from(bucket).getPublicUrl('').data.publicUrl;
      return { bucket, prefix: base.endsWith('/') ? base : `${base}/` };
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
    // El `publicUrl` es el localizador estable que el cliente guardará y reenviará en el post; con el
    // bucket privado no sirve para leer directo (403), pero de él se deriva la ruta para firmar al leer.
    const publicUrl = this.supabase.storage.from(target.bucket).getPublicUrl(data.path).data.publicUrl;
    return { uploadUrl: data.signedUrl, publicUrl, path: data.path };
  }

  ownsPublicUrl(url: string): boolean {
    return this.buckets.some(({ prefix }) => url.startsWith(prefix));
  }

  async signMediaUrls(urls: string[]): Promise<Map<string, string>> {
    const signed = new Map<string, string>();
    // Agrupa por bucket para firmar en LOTE (una llamada por bucket, no una por objeto).
    for (const { bucket, prefix } of this.buckets) {
      const entries = urls
        .filter((u) => u.startsWith(prefix))
        .map((u) => ({ url: u, path: u.slice(prefix.length).split('?')[0]! }));
      if (entries.length === 0) continue;
      const { data, error } = await this.supabase.storage
        .from(bucket)
        .createSignedUrls(entries.map((e) => e.path), SIGN_TTL_S);
      if (error || !data) {
        this.logger.warn(`no se pudo firmar media de ${bucket}: ${error?.message ?? 'sin datos'}`);
        continue; // el llamador deja la URL original (degradación suave, no rompe la respuesta)
      }
      // El orden de `data` sigue al de `entries` (misma lista de rutas).
      data.forEach((row, i) => {
        const src = entries[i];
        if (src && row.signedUrl) signed.set(src.url, row.signedUrl);
      });
    }
    return signed;
  }

  async deleteByUrls(urls: string[]): Promise<void> {
    // Best-effort: borrar el binario al borrar el post ("borré mi foto" ⇒ el objeto se va). Un fallo aquí
    // NO debe tumbar el borrado del post (ya está soft-deleted); se loguea y sigue.
    for (const { bucket, prefix } of this.buckets) {
      const paths = urls.filter((u) => u.startsWith(prefix)).map((u) => u.slice(prefix.length).split('?')[0]!);
      if (paths.length === 0) continue;
      const { error } = await this.supabase.storage.from(bucket).remove(paths);
      if (error) this.logger.warn(`no se pudieron borrar objetos de ${bucket}: ${error.message}`);
    }
  }
}
