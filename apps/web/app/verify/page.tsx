import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { Text } from '@osia/ui';
import { VerifyForm } from '../_components/VerifyForm';

/** /verify?email=... — paso de verificación del onboarding (S1.5). */
export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;
  // Sin email no hay a quién verificar ni a quién reenviar el código: /verify quedaría muerto
  // ("enviamos el código a «»" + reenviar que siempre falla). Un refresh/historial con la URL
  // recortada vuelve al inicio del onboarding en vez de a una pantalla sin salida.
  if (!email) redirect('/join');
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
          <Text variant="caption">{t('kicker')}</Text>
          <Text variant="hero">{t('title')}</Text>
        </header>
        <VerifyForm email={email} />
      </div>
    </main>
  );
}
