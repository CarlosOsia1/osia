/** Tiempo relativo localizado ("hace 3 min") con `Intl.RelativeTimeFormat`. Para metadatos de post/comentario. */
export function relativeTime(iso: string, locale: string): string {
  const diffSec = Math.round((new Date(iso).getTime() - Date.now()) / 1000); // negativo = pasado
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto', style: 'short' });
  const abs = Math.abs(diffSec);
  if (abs < 60) return rtf.format(Math.round(diffSec), 'second');
  if (abs < 3600) return rtf.format(Math.round(diffSec / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(diffSec / 3600), 'hour');
  if (abs < 2592000) return rtf.format(Math.round(diffSec / 86400), 'day');
  if (abs < 31536000) return rtf.format(Math.round(diffSec / 2592000), 'month');
  return rtf.format(Math.round(diffSec / 31536000), 'year');
}
