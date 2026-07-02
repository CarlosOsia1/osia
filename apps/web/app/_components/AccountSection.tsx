'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useMutation } from '@tanstack/react-query';
import { Button, Card, FormError, Modal, Text } from '@osia/ui';
import { LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE, locales, type Locale } from '@osia/i18n';
import { identity } from '../../lib/identity';

/**
 * Sección «Cuenta» del pasaporte (V2 Vestíbulo): idioma del ecosistema + borrado de cuenta.
 * El idioma vive en la cookie `osia.locale` (la lee el resolver server-side de cada app); NO se
 * persiste en el perfil (eso pediría migración — diferido). El borrado reusa el flujo por email
 * de S2-C2: aquí solo se pide el link (nada se borra hasta confirmarlo desde el correo).
 */
export function AccountSection() {
  const t = useTranslations('passport');
  const router = useRouter();
  const activeLocale = useLocale();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const requestDeletion = useMutation({
    mutationFn: () => identity.requestAccountDeletion(),
    onSuccess: () => setConfirmOpen(false),
  });

  function setLocale(next: Locale): void {
    // La cookie es la fuente que lee i18n/request.ts en el server; refresh() re-renderiza los RSC
    // con el idioma nuevo (los client components reciben los mensajes por el provider del layout).
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=${LOCALE_COOKIE_MAX_AGE}; samesite=lax`;
    router.refresh();
  }

  return (
    <Card pad>
      <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
        <Text variant="caption">{t('account')}</Text>

        <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
          <Text variant="body">{t('language')}</Text>
          <div role="group" aria-label={t('language')} style={{ display: 'flex', gap: 'var(--space-2)' }}>
            {locales.map((loc) => (
              <button
                key={loc}
                type="button"
                aria-pressed={activeLocale === loc}
                onClick={() => setLocale(loc)}
                className={
                  activeLocale === loc
                    ? 'osia-btn osia-btn--primary osia-btn--sm'
                    : 'osia-btn osia-btn--ghost osia-btn--sm'
                }
              >
                {t(`lang_${loc}`)}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gap: 'var(--space-2)', paddingTop: 'var(--space-3)', borderTop: '1px solid var(--color-border)' }}>
          {requestDeletion.isSuccess ? (
            <Text as="p" role="status" variant="body" tone="accent">
              {t('deleteSent')}
            </Text>
          ) : (
            <>
              <Text variant="body" tone="subtle">{t('deleteHelp')}</Text>
              <div>
                <Button variant="danger" size="sm" onClick={() => setConfirmOpen(true)}>
                  {t('deleteCta')}
                </Button>
              </div>
            </>
          )}
          {requestDeletion.isError && <FormError>{t('deleteErr')}</FormError>}
        </div>
      </div>

      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title={t('deleteConfirmTitle')}>
        <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
          <Text as="p" variant="read" tone="muted">
            {t('deleteConfirmBody')}
          </Text>
          <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
              {t('deleteCancel')}
            </Button>
            <Button variant="danger" loading={requestDeletion.isPending} onClick={() => requestDeletion.mutate()}>
              {t('deleteConfirmCta')}
            </Button>
          </div>
        </div>
      </Modal>
    </Card>
  );
}
