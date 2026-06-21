'use client';

import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { Button } from '@osia/ui';
import { locales } from '@osia/i18n';

/**
 * LanguageSwitcher — cambia el idioma escribiendo la cookie `osia.locale`.
 * Sin routing en la URL (mundo de una sola ruta). Default es-CO.
 *
 * Usa `router.refresh()` (NO recarga el documento): el layout vuelve a leer la cookie
 * y actualiza los textos, pero Next preserva el estado de los Client Components → el
 * mundo 3D y el WebSocket de voz NO se reinician (no perdés posición ni conexión).
 */
export default function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const set = (l: string) => {
    if (l === locale) return;
    document.cookie = `osia.locale=${l};path=/;max-age=31536000;samesite=lax`;
    router.refresh();
  };
  return (
    <div style={{ position: 'absolute', top: 22, right: 28, display: 'flex', gap: 4, zIndex: 20 }}>
      {locales.map((l) => (
        <Button
          key={l}
          size="sm"
          active={l === locale}
          onClick={() => set(l)}
          aria-pressed={l === locale}
        >
          {l.toUpperCase()}
        </Button>
      ))}
    </div>
  );
}
