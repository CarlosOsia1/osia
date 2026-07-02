import { getTranslations } from 'next-intl/server';
import { Text } from '@osia/ui';
import { OSIA } from '@osia/shared';
import { WaitlistForm } from './WaitlistForm';

/**
 * Landing publica (S1.4-H1): hero de marca + manifiesto + waitlist. Solo para visitantes sin
 * sesion; los residentes ven el Vestibulo (S1.7). Dark-first, Italiana para la marca, mucho
 * espacio negativo, sin Three.js (bundle liviano).
 */
export async function Landing() {
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
        <Text variant="caption">{t('kicker')}</Text>
        <Text variant="hero" className="osia-hero--wordmark">
          {OSIA.name}
        </Text>
        <Text as="p" variant="display">
          {OSIA.tagline}
        </Text>
        <Text as="p" variant="read" tone="muted" style={{ margin: '0 auto', maxWidth: '32rem' }}>
          {t('manifesto')}
        </Text>
        <section style={{ display: 'grid', gap: 'var(--space-4)', marginTop: 'var(--space-4)' }}>
          <Text as="h2" variant="caption">
            {t('waitlistTitle')}
          </Text>
          <WaitlistForm />
        </section>
      </div>
    </main>
  );
}
