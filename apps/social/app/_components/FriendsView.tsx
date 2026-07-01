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
  getFollowRequests,
  getFollowers,
  getFollowing,
  rejectFollowRequest,
} from '../../lib/social-api';
import { UserList } from './UserList';

type FriendsTab = 'followers' | 'following' | 'requests';
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
