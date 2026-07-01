import { PostDetailView } from '../../_components/PostDetailView';

/**
 * "/post/{id}" (S3.10) — detalle de una publicación (deep-link de notificaciones/compartir). El shell y
 * la sesión los provee `AppFrame`.
 */
export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PostDetailView postId={id} />;
}
