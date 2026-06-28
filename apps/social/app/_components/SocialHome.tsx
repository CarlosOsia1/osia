'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button, Text } from '@osia/ui';
import { useOsiaSession } from '@osia/identity';
import { identity } from '../../lib/identity';
import { Feed } from './Feed';

/**
 * SocialHome (S3.1-H1) — vista autenticada de La Red Social. La sesión la garantiza el `SessionGuard`
 * que envuelve esta pantalla (valida vía SSO contra el API); aquí solo se lee el Pasaporte y se compone.
 * Todo el texto pasa por `Text` de @osia/ui (CLAUDE.md §2.1). El feed real llega en S3.3-H4.
 */
export function SocialHome() {
  const t = useTranslations('social');
  const router = useRouter();
  const passport = useOsiaSession(identity).data?.passport ?? null;
  if (!passport) return null; // el SessionGuard cubre carga/redirect; defensivo

  const { profile } = passport;
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        alignContent: 'start',
        gap: 'var(--space-5)',
        maxWidth: '48rem',
        margin: '0 auto',
        padding: 'var(--space-7) var(--space-5)',
      }}
    >
      <header style={{ display: 'grid', gap: 'var(--space-2)' }}>
        <Text variant="overline" tone="accent">
          {t('kicker')}
        </Text>
        <Text variant="display">{t('title')}</Text>
      </header>
      <Text variant="body">{t('welcome', { name: profile.displayName })}</Text>
      <Text variant="body" tone="muted">
        {t('tagline')}
      </Text>
      <div style={{ justifySelf: 'start' }}>
        <Button variant="primary" onClick={() => router.push('/compose')}>
          {t('compose.open')}
        </Button>
      </div>
      <Feed />
    </main>
  );
}
