'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Skeleton, Text } from '@osia/ui';
import { useOsiaSession } from '@osia/identity';
import { identity } from '../../lib/identity';
import { getPost } from '../../lib/social-api';
import { PostCard } from './PostCard';

/**
 * PostDetailView (S3.10) — detalle de un post (destino de deep-links / compartir). Respeta la visibilidad
 * (el API devuelve 404/oculto si no lo puedes ver). Comentarios abiertos por defecto.
 */
export function PostDetailView({ postId }: { postId: string }) {
  const t = useTranslations('social');
  const qc = useQueryClient();
  const viewerHandle = useOsiaSession(identity).data?.passport?.profile?.handle ?? null;
  const postKey = ['social', 'post', postId] as const;
  const q = useQuery({ queryKey: postKey, queryFn: () => getPost(postId) });

  if (q.isPending) return <Skeleton variant="block" width="100%" height="20rem" />;
  if (q.isError || !q.data) {
    return (
      <Text variant="read" tone="muted">
        {t('post.notFound')}
      </Text>
    );
  }
  return (
    <section style={{ display: 'grid', gap: 'var(--space-4)' }}>
      <PostCard
        post={q.data}
        viewerHandle={viewerHandle}
        onMutated={() => void qc.invalidateQueries({ queryKey: postKey })}
        defaultShowComments
      />
    </section>
  );
}
