import type { Metadata } from 'next';
import { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';
import { MessagesView } from '../_components/MessagesView';

/**
 * "/mensajes" (R5) — la bandeja de mensajería directa. El shell y la sesión los provee
 * `AppFrame`. `useSearchParams` (deep-link `?con=`) exige el límite de Suspense.
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('social');
  return { title: t('dm.title') };
}

export default function MensajesPage() {
  return (
    <Suspense fallback={null}>
      <MessagesView />
    </Suspense>
  );
}
