import { getTranslations } from 'next-intl/server';
import { OSIA } from '@osia/shared';
import { WaitlistForm } from './_components/WaitlistForm';

/**
 * Landing de OSIA (S1.4-H1): hero de marca + manifiesto + waitlist. Dark-first, Italiana para la
 * marca, Jost para el resto, mucho espacio negativo. Sin Three.js (bundle liviano).
 */
export default async function LandingPage() {
  const t = await getTranslations('landing');
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: 'var(--space-7) var(--space-5)',
        textAlign: 'center',
      }}
    >
      <div style={{ display: 'grid', gap: 'var(--space-6)', maxWidth: '44rem' }}>
        <span className="osia-overline">{t('kicker')}</span>
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(3.5rem, 14vw, 7rem)',
            lineHeight: 'var(--leading-none)',
            letterSpacing: 'var(--tracking-wide)',
            color: 'var(--color-text-strong)',
            margin: 0,
          }}
        >
          {OSIA.name}
        </h1>
        <p
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'var(--text-xl)',
            color: 'var(--color-accent)',
            letterSpacing: 'var(--tracking-wide)',
            margin: 0,
          }}
        >
          {OSIA.tagline}
        </p>
        <p
          style={{
            color: 'var(--color-text-muted)',
            lineHeight: 'var(--leading-loose)',
            fontSize: 'var(--text-lg)',
            margin: '0 auto',
            maxWidth: '32rem',
          }}
        >
          {t('manifesto')}
        </p>
        <section style={{ display: 'grid', gap: 'var(--space-4)', marginTop: 'var(--space-4)' }}>
          <h2 className="osia-overline" style={{ margin: 0 }}>
            {t('waitlistTitle')}
          </h2>
          <WaitlistForm />
        </section>
      </div>
    </main>
  );
}
