import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { PostDetailView } from '../../_components/PostDetailView';

/**
 * "/publicacion/{id}" (R2) — detalle de una publicación (deep-link de notificaciones/compartir).
 * El shell y la sesión los provee `AppFrame`. Metadata de MARCA (título genérico traducido; el
 * contenido del post exige sesión y no se filtra a crawlers).
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('social');
  return { title: t('meta.post') };
}

export default async function PublicacionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PostDetailView postId={id} />;
}
