'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { AppSwitcher, Button, ExperienceThreshold, PassportCard, ThresholdTransition } from '@osia/ui';
import { useOsiaSession } from '@osia/identity';
import { LIVE_EXPERIENCES, OSIA } from '@osia/shared';
import { identity } from '../../lib/identity';
import { worldUrl } from '../../lib/worldUrl';
import { track } from '../../lib/analytics';

/**
 * Vestibulo (S1.7) — el hogar del residente con sesion: pasaporte celeste + una sola puerta
 * (El Mundo) leida del catalogo + cruce ceremonial. NO es un launcher ni una grilla de iconos.
 * Si la sesion expira (cookie stale), vuelve a /login.
 */
export function Vestibule() {
  const t = useTranslations('vestibule');
  const tDoor = useTranslations('door');
  const router = useRouter();
  const session = useOsiaSession(identity);
  const [crossing, setCrossing] = useState(false);

  useEffect(() => {
    if (session.isError) router.replace('/login');
  }, [session.isError, router]);

  const switcherExperiences = LIVE_EXPERIENCES.map((exp) => ({
    id: exp.id,
    name: tDoor(`${exp.id}.name`),
    live: exp.estado === 'live',
  }));

  const passport = session.data?.passport ?? null;
  if (session.isError) return null; // redirigiendo a /login
  if (!passport) {
    return (
      <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <p style={{ color: 'var(--color-text-muted)' }}>{t('loading')}</p>
      </main>
    );
  }
  const { profile } = passport;

  function cross(experienceId: string): void {
    track('vestibulo.threshold.crossed', { experienceId });
    setCrossing(true);
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        alignContent: 'start',
        gap: 'var(--space-7)',
        maxWidth: '48rem',
        margin: '0 auto',
        padding: 'var(--space-7) var(--space-5)',
      }}
    >
      <header style={{ display: 'flex', justifyContent: 'center' }}>
        <AppSwitcher experiences={switcherExperiences} currentId="world" brandLabel={OSIA.name} />
      </header>

      <PassportCard
        handle={profile.handle}
        displayName={profile.displayName}
        accentColor={profile.accentColor}
        avatarUrl={profile.avatarUrl}
        popularityPoints={profile.popularityPoints}
        popularityLabel={t('popularity')}
        presenceLabel={t('present')}
        watermark={OSIA.name}
      >
        <Button variant="ghost" size="sm" onClick={() => router.push('/passport')}>
          {t('editPassport')}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => void identity.logout().finally(() => (window.location.href = '/'))}
        >
          {t('logout')}
        </Button>
      </PassportCard>

      <section style={{ display: 'grid', gap: 'var(--space-4)' }} aria-label={t('doorsLabel')}>
        {LIVE_EXPERIENCES.map((exp) => (
          <ExperienceThreshold
            key={exp.id}
            name={tDoor(`${exp.id}.name`)}
            tagline={tDoor(`${exp.id}.tagline`)}
            ctaLabel={t('enter')}
            status={exp.estado === 'live' ? 'live' : 'coming-soon'}
            onCross={() => cross(exp.id)}
          />
        ))}
      </section>

      <ThresholdTransition
        active={crossing}
        brand={OSIA.name}
        label={t('crossing')}
        onComplete={() => {
          window.location.href = worldUrl();
        }}
      />
    </main>
  );
}
