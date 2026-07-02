/**
 * Adjunto (forma estructural; el contrato canónico `MediaItem` vive en @osia/shared). El design system es
 * agnóstico de dominio: no importa contratos, recibe la forma por props (estructuralmente compatible).
 */
export type GalleryMedia = { url: string; kind: 'image' | 'video' };

/**
 * MediaGallery — muestra los adjuntos de un post (imagen `<img>` / video `<video controls>`). Layout por
 * cantidad (1 grande, 2 en fila, 3-4 en rejilla), estilo Instagram. El video se reproduce del original
 * (sin transcodificar), `preload=metadata` para no descargar de más.
 *
 * Con `onItemClick` (R2), cada IMAGEN se vuelve botón (abre el Lightbox de la app con su índice);
 * `itemLabel` es su nombre accesible, ya traducido. El video conserva sus controles nativos.
 */
export function MediaGallery({
  media,
  onItemClick,
  itemLabel,
}: {
  media: readonly GalleryMedia[];
  onItemClick?: (index: number) => void;
  itemLabel?: string;
}) {
  if (media.length === 0) return null;
  return (
    <div className="osia-media" data-count={Math.min(media.length, 4)}>
      {media.slice(0, 4).map((m, i) =>
        m.kind === 'video' ? (
          <video key={i} className="osia-media__item" src={m.url} controls preload="metadata" playsInline />
        ) : onItemClick ? (
          <button
            key={i}
            type="button"
            className="osia-media__button"
            aria-label={itemLabel}
            onClick={() => onItemClick(i)}
          >
            <img className="osia-media__item" src={m.url} alt="" loading="lazy" />
          </button>
        ) : (
          <img key={i} className="osia-media__item" src={m.url} alt="" loading="lazy" />
        ),
      )}
    </div>
  );
}
