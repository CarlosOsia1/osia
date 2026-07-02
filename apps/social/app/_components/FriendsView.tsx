'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Button, Tabs, Text } from '@osia/ui';
import type { FollowRequestDto } from '@osia/shared';
import { useOsiaSession } from '@osia/identity';
import { identity } from '../../lib/identity';
import {
  acceptFollowRequest,
  getBlocked,
  getFollowRequests,
  getFollowers,
  getFollowing,
  getMuted,
  rejectFollowRequest,
  unblockAccount,
  unmuteAccount,
} from '../../lib/api';
import { UserList } from './UserList';

type FriendsTab = 'followers' | 'following' | 'requests' | 'management';
const REQUESTS_KEY = ['social', 'requests'] as const;

/**
 * FriendsView (S3.9) — tu red: pestañas Seguidores · Seguidos · Solicitudes (entrantes). Las listas se
 * paginan (infinite). En Solicitudes puedes Aceptar (pasa a seguidor) o Rechazar. Compone @osia/ui + i18n.
 */
export function FriendsView() {
  const t = useTranslations('social');
  const myHandle = useOsiaSession(identity).data?.passport?.profile?.handle ?? '';
  const [tab, setTab] = useState<FriendsTab>('followers');

  const reqCountQ = useQuery({
    queryKey: [...REQUESTS_KEY, 'count'],
    queryFn: async () => (await getFollowRequests()).data.length,
  });

  const tabs = [
    { key: 'followers', label: t('friends.tabs.followers') },
    { key: 'following', label: t('friends.tabs.following') },
    { key: 'requests', label: t('friends.tabs.requests'), count: reqCountQ.data ?? 0 },
    { key: 'management', label: t('friends.tabs.management') },
  ];

  return (
    <section style={{ display: 'grid', gap: 'var(--space-5)' }}>
      <Text variant="heading">{t('nav.friends')}</Text>
      <Tabs tabs={tabs} activeKey={tab} onChange={(k) => setTab(k as FriendsTab)} label={t('nav.friends')} />

      {tab === 'followers' && myHandle && (
        <UserList
          queryKey={['social', 'followers', myHandle]}
          fetchPage={(c) => getFollowers(myHandle, c)}
          emptyLabel={t('friends.emptyFollowers')}
        />
      )}
      {tab === 'following' && myHandle && (
        <UserList
          queryKey={['social', 'following', myHandle]}
          fetchPage={(c) => getFollowing(myHandle, c)}
          emptyLabel={t('friends.emptyFollowing')}
        />
      )}
      {tab === 'requests' && (
        <UserList<FollowRequestDto>
          queryKey={REQUESTS_KEY}
          fetchPage={getFollowRequests}
          emptyLabel={t('friends.emptyRequests')}
          renderAction={(u) => <RequestActions requesterId={u.accountId} />}
        />
      )}
      {tab === 'management' && (
        <div className="osia-feed">
          <Text variant="overline" tone="subtle">
            {t('moderation.blockedTitle')}
          </Text>
          <UserList<FollowRequestDto>
            queryKey={['social', 'blocked']}
            fetchPage={getBlocked}
            emptyLabel={t('moderation.emptyBlocked')}
            renderAction={(u) => <UndoAction accountId={u.accountId} kind="block" />}
          />
          <Text variant="overline" tone="subtle">
            {t('moderation.mutedTitle')}
          </Text>
          <UserList<FollowRequestDto>
            queryKey={['social', 'muted']}
            fetchPage={getMuted}
            emptyLabel={t('moderation.emptyMuted')}
            renderAction={(u) => <UndoAction accountId={u.accountId} kind="mute" />}
          />
        </div>
      )}
    </section>
  );
}

function RequestActions({ requesterId }: { requesterId: string }) {
  const t = useTranslations('social');
  const qc = useQueryClient();
  const invalidate = (): void => {
    void qc.invalidateQueries({ queryKey: REQUESTS_KEY });
    void qc.invalidateQueries({ queryKey: ['social', 'followers'] });
    void qc.invalidateQueries({ queryKey: ['social', 'profile'] });
  };
  const accept = useMutation({ mutationFn: () => acceptFollowRequest(requesterId), onSuccess: invalidate });
  const reject = useMutation({ mutationFn: () => rejectFollowRequest(requesterId), onSuccess: invalidate });
  return (
    <>
      <Button size="sm" variant="primary" loading={accept.isPending} onClick={() => accept.mutate()}>
        {t('friends.accept')}
      </Button>
      <Button size="sm" variant="ghost" loading={reject.isPending} onClick={() => reject.mutate()}>
        {t('friends.reject')}
      </Button>
    </>
  );
}

/** Deshacer bloqueo/silencio desde la gestión (R4.4): un botón discreto por fila. */
function UndoAction({ accountId, kind }: { accountId: string; kind: 'block' | 'mute' }) {
  const t = useTranslations('social');
  const qc = useQueryClient();
  const undo = useMutation({
    mutationFn: () => (kind === 'block' ? unblockAccount(accountId) : unmuteAccount(accountId)),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['social', kind === 'block' ? 'blocked' : 'muted'] });
      void qc.invalidateQueries({ queryKey: ['social', 'feed'] });
      void qc.invalidateQueries({ queryKey: ['social', 'profile'] });
    },
  });
  return (
    <Button size="sm" variant="ghost" loading={undo.isPending} onClick={() => undo.mutate()}>
      {kind === 'block' ? t('moderation.unblock') : t('moderation.unmute')}
    </Button>
  );
}
