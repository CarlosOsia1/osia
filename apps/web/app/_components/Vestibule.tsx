'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { AppSwitcher, Button, ExperienceThreshold, PassportCard, Skeleton, ThresholdTransition } from '@osia/ui';
import { useOsiaSession } from '@osia/identity';
import { LIVE_EXPERIENCES, OSIA, type ExperienceId } from '@osia/shared';
import { identity } from '../../lib/identity';
import { experienceUrl } from '../../lib/experienceUrl';
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
  const [crossingId, setCrossingId] = useState<ExperienceId | null>(null);

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
    // Skeleton con la MISMA silueta del Vestíbulo cargado (switcher + pasaporte + 2 puertas): sin
    // salto de layout. No hay SSR de la sesión a propósito: GET /v1/auth/session ROTA la cookie de
    // refresh (single-use) y un server component de Next no puede reescribirla → rompería la sesión
    // del navegador. El SSR real llega con la sesión server-side de la Ola 1.
    return (
      <main
        aria-busy="true"
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
        <span className="osia-sr-only" role="status">
          {t('loading')}
        </span>
        <header style={{ display: 'flex', justifyContent: 'center' }}>
          <Skeleton width="16rem" height="2.5rem" />
        </header>
        <Skeleton height="13rem" />
        <div style={{ display: 'grid', gap: 'var(--space-4)' }} aria-hidden>
          <Skeleton height="8rem" />
          <Skeleton height="8rem" />
        </div>
      </main>
    );
  }
  const { profile } = passport;

  function cross(experienceId: ExperienceId): void {
    track('vestibulo.threshold.crossed', { experienceId });
    setCrossingId(experienceId);
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
        active={crossingId !== null}
        brand={OSIA.name}
        label={t('crossing')}
        onComplete={() => {
          if (crossingId) window.location.href = experienceUrl(crossingId);
        }}
      />
    </main>
  );
}
