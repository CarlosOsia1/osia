import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { BookmarksView } from '../_components/BookmarksView';

/**
 * "/guardados" (R4.2) — la colección privada del lector. El shell y la sesión los provee
 * `AppFrame`. Metadata de marca.
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('social');
  return { title: t('nav.bookmarks') };
}

export default function GuardadosPage() {
  return <BookmarksView />;
}
