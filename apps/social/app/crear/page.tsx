import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { PostComposer } from '../_components/PostComposer';

/**
 * "/crear" (R2) — publicar, como página completa: fallback del tab bar móvil y de deep-links.
 * En desktop el composer vive inline en el feed y como modal global (mismas tripas:
 * `PostComposerForm`). La sesión SSO y el shell los provee `AppFrame`.
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('social');
  return { title: t('meta.compose') };
}

export default function CrearPage() {
  return <PostComposer />;
}
