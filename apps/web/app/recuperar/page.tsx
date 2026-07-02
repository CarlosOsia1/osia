import { getTranslations } from 'next-intl/server';
import { Text } from '@osia/ui';
import { RecoverForm } from '../_components/RecoverForm';

/** /recuperar?email=... — recuperación de contraseña por OTP (V1 Vestíbulo). */
export default async function RecoverPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;
  const t = await getTranslations('recover');
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
          <Text variant="caption">{t('kicker')}</Text>
          <Text variant="hero">{t('title')}</Text>
        </header>
        <RecoverForm initialEmail={email ?? ''} />
      </div>
    </main>
  );
}
