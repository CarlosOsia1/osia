'use client';

import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { Button, HudPanel } from '@osia/ui';
import { locales, LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE } from '@osia/i18n';

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
    document.cookie = `${LOCALE_COOKIE}=${l};path=/;max-age=${LOCALE_COOKIE_MAX_AGE};samesite=lax`;
    router.refresh();
  };
  return (
    <HudPanel interactive style={{ top: 22, right: 28, display: 'flex', gap: 4 }}>
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
    </HudPanel>
  );
}
