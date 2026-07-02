'use client';

import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Avatar, Button, Text, useToast } from '@osia/ui';
import { acceptFollowRequest, getFollowRequests, rejectFollowRequest } from '../../lib/api';
import { queryKeys } from '../../lib/query-keys';
import { routes } from '../../lib/routes';

/**
 * Solicitudes en el rail (R2): las pendientes de tu cuenta privada, con aceptar/rechazar
 * INLINE — decidir sin salir del feed. Sin solicitudes, el card no existe (el rail no mete
 * ruido). La lista completa sigue en Amigos.
 */
export function RailRequests() {
  const t = useTranslations('social');
  const toast = useToast();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: queryKeys.requests, queryFn: () => getFollowRequests() });

  const invalidate = (): void => {
    void qc.invalidateQueries({ queryKey: queryKeys.requests });
    void qc.invalidateQueries({ queryKey: ['social', 'followers'] });
    void qc.invalidateQueries({ queryKey: queryKeys.notifications });
  };
  const accept = useMutation({
    mutationFn: (requesterId: string) => acceptFollowRequest(requesterId),
    onSuccess: invalidate,
    onError: () => toast.error(t('errors.follow')),
  });
  const reject = useMutation({
    mutationFn: (requesterId: string) => rejectFollowRequest(requesterId),
    onSuccess: invalidate,
    onError: () => toast.error(t('errors.follow')),
  });

  const requests = q.data?.data ?? [];
  if (requests.length === 0) return null;

  return (
    <section className="osia-railcard" aria-label={t('rail.requestsTitle')}>
      <div className="osia-railcard__head">
        <Text variant="overline" tone="subtle">
          {t('rail.requestsTitle')}
        </Text>
        <Link href={routes.amigos} className="osia-railcard__link">
          <Text variant="caption" tone="accent" as="span">
            {t('rail.seeAll')}
          </Text>
        </Link>
      </div>
      <div className="osia-railcard__list">
        {requests.slice(0, 4).map((r) => (
          <div key={r.accountId} className="osia-railrequest">
            <Link href={routes.perfil(r.handle)} className="osia-railpresence">
              <Avatar src={r.avatarUrl} name={r.displayName} size={34} />
            </Link>
            <span className="osia-railrequest__meta">
              <Text variant="meta" as="span">
                {r.displayName}
              </Text>
              <Text variant="caption" tone="subtle" as="span">
                {`@${r.handle}`}
              </Text>
            </span>
            <span className="osia-railrequest__actions">
              <Button
                size="sm"
                variant="primary"
                loading={accept.isPending && accept.variables === r.accountId}
                onClick={() => accept.mutate(r.accountId)}
              >
                {t('friends.accept')}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                loading={reject.isPending && reject.variables === r.accountId}
                onClick={() => reject.mutate(r.accountId)}
              >
                {t('friends.reject')}
              </Button>
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
