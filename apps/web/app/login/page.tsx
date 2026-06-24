import { getTranslations } from 'next-intl/server';
import { LoginForm } from '../_components/LoginForm';

/** /login — entrada de residentes que vuelven (S1.3-H3 UI). */
export default async function LoginPage() {
  const t = await getTranslations('login');
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: 'var(--space-7) var(--space-5)',
      }}
    >
      <div style={{ display: 'grid', gap: 'var(--space-6)', maxWidth: '24rem', width: '100%' }}>
        <header style={{ textAlign: 'center', display: 'grid', gap: 'var(--space-2)' }}>
          <span className="osia-overline">{t('kicker')}</span>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', margin: 0, color: 'var(--color-text-strong)' }}>
            {t('title')}
          </h1>
        </header>
        <LoginForm />
      </div>
    </main>
  );
}
