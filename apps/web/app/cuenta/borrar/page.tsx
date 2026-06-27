import { getTranslations } from 'next-intl/server';
import { DeleteAccountConfirm } from '../../_components/DeleteAccountConfirm';

/**
 * /cuenta/borrar?token=... — destino del LINK de borrado de cuenta por email (S2-C2). Página
 * PÚBLICA (se llega desde el correo, quizá sin sesión): el token ES la prueba. El borrado NO se
 * dispara solo al abrir (los clientes de email pre-cargan links); requiere un clic explícito.
 */
export default async function DeleteAccountPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const t = await getTranslations('deleteAccount');
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
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '2.5rem',
              margin: 0,
              color: 'var(--color-text-strong)',
            }}
          >
            {t('title')}
          </h1>
        </header>
        <DeleteAccountConfirm token={token ?? ''} />
      </div>
    </main>
  );
}
