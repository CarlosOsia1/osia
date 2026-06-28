'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Text } from '@osia/ui';
import { useOsiaSession } from '@osia/identity';
import { identity } from '../../lib/identity';
import { vestibuleLoginUrl } from '../../lib/vestibule';

/**
 * SocialHome (S3.1-H1) — el "hola mundo autenticado" de La Red Social: demuestra SSO sin re-login.
 * Revalida la sesión vía el pasaporte compartido; si está stale (401), vuelve al login del Vestíbulo
 * con returnTo. Todo el texto pasa por `Text` de @osia/ui (CLAUDE.md §2.1). El feed real llega en S3.3.
 */
export function SocialHome() {
  const t = useTranslations('social');
  const session = useOsiaSession(identity);

  useEffect(() => {
    if (session.isError) window.location.href = vestibuleLoginUrl(window.location.href);
  }, [session.isError]);

  const passport = session.data?.passport ?? null;

  if (session.isError) return null; // redirigiendo al Vestíbulo

  if (!passport) {
    return (
      <main
        style={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          padding: 'var(--space-7) var(--space-5)',
        }}
      >
        <Text tone="muted">{t('loading')}</Text>
      </main>
    );
  }

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
      <Text variant="label" tone="subtle">
        {t('comingSoon')}
      </Text>
    </main>
  );
}
