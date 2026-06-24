import { getTranslations } from 'next-intl/server';
import { VerifyForm } from '../_components/VerifyForm';

/** /verify?email=... — paso de verificación del onboarding (S1.5). Code-input de 6 celdas. */
export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;
  const t = await getTranslations('verify');
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: 'var(--space-7) var(--space-5)',
      }}
    >
      <div style={{ display: 'grid', gap: 'var(--space-6)', maxWidth: '28rem', width: '100%' }}>
        <header style={{ textAlign: 'center', display: 'grid', gap: 'var(--space-2)' }}>
          <span className="osia-overline">{t('kicker')}</span>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', margin: 0, color: 'var(--color-text-strong)' }}>
            {t('title')}
          </h1>
        </header>
        <VerifyForm email={email ?? ''} />
      </div>
    </main>
  );
}
