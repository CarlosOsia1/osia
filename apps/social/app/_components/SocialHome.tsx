'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Avatar, Card } from '@osia/ui';
import { useOsiaSession } from '@osia/identity';
import { identity } from '../../lib/identity';
import { Feed } from './Feed';

/**
 * SocialHome (S3.7) — contenido central de "/": la entrada al composer ("Publica algo") + el feed. El
 * shell (header/sidebar/tab bar) y la sesión los provee `AppFrame` en el layout; aquí solo va el cuerpo.
 * Todo el estilo pasa por @osia/ui (§2.1).
 */
export function SocialHome() {
  const t = useTranslations('social');
  const router = useRouter();
  const profile = useOsiaSession(identity).data?.passport?.profile ?? null;

  return (
    <>
      <Card pad>
        <button className="osia-composer-entry" onClick={() => router.push('/compose')}>
          <Avatar src={profile?.avatarUrl ?? undefined} name={profile?.displayName ?? 'OSIA'} size={44} />
          <span className="osia-composer-entry__prompt">{t('compose.open')}</span>
        </button>
      </Card>
      <Feed />
    </>
  );
}
