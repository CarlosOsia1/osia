import type { UploadTargetDto } from '@osia/shared';

export const STORAGE_PORT = Symbol('STORAGE_PORT');

/**
 * Puerto de salida del almacenamiento de media (S3.3-H1). El API nunca recibe el binario: mintea un
 * destino PREFIRMADO al que el cliente sube directo. La implementación concreta (Supabase Storage hoy,
 * R2 mañana) vive en `infrastructure/storage` — el caso de uso depende solo de esta abstracción (§1.1-D).
 */
export interface StoragePort {
  /** Mintea un destino prefirmado para subir un adjunto. La ruta queda scoped a la cuenta. */
  createUploadTarget(accountId: string, contentType: string): Promise<UploadTargetDto>;
  /** ¿La URL pública pertenece a NUESTRO Storage? Rechaza URLs externas arbitrarias en `post.media`. */
  ownsPublicUrl(url: string): boolean;
  /**
   * Firma (URL prefirmada con TTL) cada URL de media de NUESTRO Storage (Ola 1D). Devuelve un mapa
   * `urlGuardada → urlFirmada`; las URLs ajenas/no reconocibles se omiten (el llamador deja la original).
   * Con los buckets de post en PRIVADO, esta es la ÚNICA forma de servir la media: el API solo firma para
   * quien ya pasó la visibilidad. Funciona también sobre buckets públicos (firma válida), así que el
   * despliegue es no-breaking hasta que se flippeen los buckets.
   */
  signMediaUrls(urls: string[]): Promise<Map<string, string>>;
  /** Borra los objetos de NUESTRO Storage referidos por estas URLs (best-effort; al borrar un post). */
  deleteByUrls(urls: string[]): Promise<void>;
}
