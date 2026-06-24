import { getTranslations } from 'next-intl/server';
import { PassportEditor } from '../_components/PassportEditor';

/** /passport — el pasaporte editable (S1.6). Placeholder del Vestíbulo hasta S1.7. */
export default async function PassportPage() {
  const t = await getTranslations('passport');
  return (
    <main style={{ minHeight: '100vh', padding: 'var(--space-7) var(--space-5)' }}>
      <div style={{ maxWidth: '34rem', margin: '0 auto', display: 'grid', gap: 'var(--space-6)' }}>
        <header style={{ textAlign: 'center', display: 'grid', gap: 'var(--space-2)' }}>
          <span className="osia-overline">{t('kicker')}</span>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', margin: 0, color: 'var(--color-text-strong)' }}>
            {t('title')}
          </h1>
        </header>
        <PassportEditor />
      </div>
    </main>
  );
}
