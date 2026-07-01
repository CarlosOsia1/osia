'use client';

import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { Avatar, Button, Card, Text } from '@osia/ui';
import type { NotificationDto } from '@osia/shared';
import { getNotifications, markAllNotificationsRead } from '../../lib/social-api';
import { relativeTime } from '../../lib/time';

const NOTIF_KEY = ['social', 'notifications'] as const;

/** Destino del deep-link (S3.11): reacción/comentario/mención → el post; follow/solicitud → el perfil. */
function hrefFor(n: NotificationDto): string | null {
  if (n.type === 'reaction' || n.type === 'comment' || n.type === 'mention') {
    const pid = n.payload && typeof n.payload.postId === 'string' ? n.payload.postId : null;
    return pid ? `/post/${pid}` : null;
  }
  return n.actor ? `/profile/${n.actor.handle}` : null;
}

/**
 * Notificaciones (S3.4-H2; deep-link en S3.11): lista + `unreadCount` + marcar todas leídas. En vivo por
 * polling (30 s, S3.6-H1). Cada línea enlaza a su destino y muestra el avatar del actor y el tiempo.
 * Compone @osia/ui + i18n (§2.1).
 */
export function Notifications() {
  const t = useTranslations('social');
  const locale = useLocale();
  const qc = useQueryClient();
  const query = useQuery({ queryKey: NOTIF_KEY, queryFn: getNotifications, refetchInterval: 30_000 });
  const markRead = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => void qc.invalidateQueries({ queryKey: NOTIF_KEY }),
  });

  if (query.isPending || !query.data) return null;
  const items = query.data.data;
  const { unreadCount } = query.data;

  return (
    <Card pad>
      <section style={{ display: 'grid', gap: 'var(--space-3)' }}>
        <div
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}
        >
          <Text variant="heading">{t('notif.title')}</Text>
          {unreadCount > 0 && (
            <Button size="sm" variant="ghost" loading={markRead.isPending} onClick={() => markRead.mutate()}>
              {`${t('notif.markRead')} · ${t('notif.unread', { count: unreadCount })}`}
            </Button>
          )}
        </div>
        {items.length === 0 ? (
          <Text variant="read" tone="muted">
            {t('notif.empty')}
          </Text>
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '2px' }}>
            {items.map((n) => {
              const href = hrefFor(n);
              const body = (
                <span className="osia-userrow" data-unread={n.readAt ? undefined : true}>
                  <Avatar
                    src={n.actor?.avatarUrl ?? undefined}
                    name={n.actor?.displayName ?? t('notif.someone')}
                    size={40}
                  />
                  <span className="osia-userrow__id">
                    <Text variant="read" tone={n.readAt ? 'muted' : 'default'}>
                      {t(`notif.${n.type}`, { name: n.actor?.displayName ?? t('notif.someone') })}
                    </Text>
                    <Text variant="meta" tone="subtle">
                      {relativeTime(n.createdAt, locale)}
                    </Text>
                  </span>
                </span>
              );
              return (
                <li key={n.id}>
                  {href ? (
                    <Link href={href} style={{ textDecoration: 'none', color: 'inherit' }}>
                      {body}
                    </Link>
                  ) : (
                    body
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </Card>
  );
}
