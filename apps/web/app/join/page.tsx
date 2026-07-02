import { getTranslations } from 'next-intl/server';
import { Text } from '@osia/ui';
import { SignupForm } from '../_components/SignupForm';

/**
 * /join?code=OSIA-XXXX — canje de invitación + registro (S1.4-H4). Pre-rellena el código del
 * deep-link de la InvitationCard. El gate invite-only real es server-side (apps/api).
 */
export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;
  const t = await getTranslations('signup');
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: 'var(--space-7) var(--space-5)',
      }}
    >
      <div style={{ display: 'grid', gap: 'var(--space-5)', maxWidth: '28rem', width: '100%' }}>
        <header style={{ textAlign: 'center', display: 'grid', gap: 'var(--space-2)' }}>
          <Text variant="caption">{t('kicker')}</Text>
          <Text variant="hero">{t('title')}</Text>
        </header>
        <SignupForm initialCode={code ?? ''} />
      </div>
    </main>
  );
}
