import { getTranslations } from 'next-intl/server';
import { OSIA } from '@osia/shared';

/**
 * Home del Vestíbulo — placeholder de cimientos (S1.1). El Vestíbulo real (PassportCard +
 * 1 puerta + ThresholdTransition) se construye en S1.7; aquí solo se prueba que la app arranca
 * con el design system + i18n, dark-first y sin Three.js.
 */
export default async function HomePage() {
  const t = await getTranslations('web');
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: 'var(--space-7)',
        textAlign: 'center',
      }}
    >
      <div style={{ display: 'grid', gap: 'var(--space-5)', maxWidth: '40rem' }}>
        <span className="osia-overline">{t('kicker')}</span>
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(3rem, 12vw, 6rem)',
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
        <p style={{ color: 'var(--color-text-muted)', lineHeight: 'var(--leading-normal)', margin: 0 }}>
          {t('building')}
        </p>
        <div>
          <a className="osia-btn osia-btn--primary osia-btn--lg" href="/styleguide">
            {t('styleguide')}
          </a>
        </div>
      </div>
    </main>
  );
}
