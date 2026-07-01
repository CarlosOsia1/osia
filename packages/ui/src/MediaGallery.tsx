/**
 * Adjunto (forma estructural; el contrato canónico `MediaItem` vive en @osia/shared). El design system es
 * agnóstico de dominio: no importa contratos, recibe la forma por props (estructuralmente compatible).
 */
export type GalleryMedia = { url: string; kind: 'image' | 'video' };

/**
 * MediaGallery — muestra los adjuntos de un post (imagen `<img>` / video `<video controls>`). Layout por
 * cantidad (1 grande, 2 en fila, 3-4 en rejilla), estilo Instagram. El video se reproduce del original
 * (sin transcodificar), `preload=metadata` para no descargar de más.
 */
export function MediaGallery({ media }: { media: readonly GalleryMedia[] }) {
  if (media.length === 0) return null;
  return (
    <div className="osia-media" data-count={Math.min(media.length, 4)}>
      {media.slice(0, 4).map((m, i) =>
        m.kind === 'video' ? (
          <video key={i} className="osia-media__item" src={m.url} controls preload="metadata" playsInline />
        ) : (
          <img key={i} className="osia-media__item" src={m.url} alt="" loading="lazy" />
        ),
      )}
    </div>
  );
}
