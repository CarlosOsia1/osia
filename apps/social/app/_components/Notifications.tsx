'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Button, Card, Text } from '@osia/ui';
import { getNotifications, markAllNotificationsRead } from '../../lib/social-api';

const NOTIF_KEY = ['social', 'notifications'] as const;

/**
 * Notificaciones (S3.4-H2): lee `GET /v1/notifications` (lista + `unreadCount`) y permite marcar todas
 * leídas. Cada línea se localiza por tipo con el nombre del actor. Texto vía `Text`/i18n, tokens (§2.1).
 * El push en vivo llega en S3.6 (tiempo real); por ahora se refresca al cargar / tras marcar.
 */
export function Notifications() {
  const t = useTranslations('social');
  const qc = useQueryClient();
  // S3.6-H1: entrega "en vivo" por polling (cada 30 s). El push por Supabase Realtime queda diferido
  // (mejora futura); el polling es el fallback que el backlog contempla.
  const query = useQuery({ queryKey: NOTIF_KEY, queryFn: getNotifications, refetchInterval: 30_000 });
  const markRead = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => void qc.invalidateQueries({ queryKey: NOTIF_KEY }),
  });

  if (query.isPending || !query.data) return null; // silencioso mientras resuelve
  const items = query.data.data;
  const { unreadCount } = query.data;

  return (
    <Card pad>
      <section style={{ display: 'grid', gap: 'var(--space-3)' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 'var(--space-3)',
            flexWrap: 'wrap',
          }}
        >
          <Text variant="title">{t('notif.title')}</Text>
          {unreadCount > 0 && (
            <Button size="sm" variant="ghost" loading={markRead.isPending} onClick={() => markRead.mutate()}>
              {`${t('notif.markRead')} · ${t('notif.unread', { count: unreadCount })}`}
            </Button>
          )}
        </div>
        {items.length === 0 ? (
          <Text variant="label" tone="muted">
            {t('notif.empty')}
          </Text>
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 'var(--space-2)' }}>
            {items.map((n) => (
              <li key={n.id}>
                <Text variant="body" tone={n.readAt ? 'muted' : 'default'}>
                  {t(`notif.${n.type}`, { name: n.actor?.displayName ?? t('notif.someone') })}
                </Text>
              </li>
            ))}
          </ul>
        )}
      </section>
    </Card>
  );
}
