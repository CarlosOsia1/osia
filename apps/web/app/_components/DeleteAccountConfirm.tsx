'use client';

import { useTranslations } from 'next-intl';
import { useMutation } from '@tanstack/react-query';
import { Button, FormError, Text } from '@osia/ui';
import { OsiaApiError } from '@osia/identity';
import { identity } from '../../lib/identity';

/**
 * Confirmación del borrado por link de email (S2-C2). El token viene en la URL; al confirmar llama a
 * /v1/accounts/deletion/confirm (público). Acción destructiva → botón `danger` y clic explícito.
 */
export function DeleteAccountConfirm({ token }: { token: string }) {
  const t = useTranslations('deleteAccount');
  const del = useMutation({ mutationFn: () => identity.confirmAccountDeletion(token) });

  if (!token) {
    return (
      <div style={{ display: 'grid', gap: 'var(--space-4)', textAlign: 'center' }}>
        <FormError>{t('noToken')}</FormError>
        <div>
          <a className="osia-btn osia-btn--ghost osia-btn--sm" href="/">
            {t('home')}
          </a>
        </div>
      </div>
    );
  }

  if (del.isSuccess) {
    return (
      <div style={{ display: 'grid', gap: 'var(--space-4)', textAlign: 'center' }}>
        <Text as="p" role="status" variant="display">
          {t('success')}
        </Text>
        <div>
          <a className="osia-btn osia-btn--ghost osia-btn--sm" href="/">
            {t('home')}
          </a>
        </div>
      </div>
    );
  }

  const errorMsg =
    del.isError && del.error instanceof OsiaApiError && del.error.code === 'BAD_REQUEST'
      ? t('errInvalid')
      : del.isError
        ? t('errGeneric')
        : null;

  return (
    <div style={{ display: 'grid', gap: 'var(--space-5)', textAlign: 'center' }}>
      <Text as="p" variant="read" tone="muted">
        {t('warning')}
      </Text>
      {errorMsg && <FormError>{errorMsg}</FormError>}
      <div style={{ display: 'grid', gap: 'var(--space-3)', justifyItems: 'center' }}>
        <Button variant="danger" size="lg" loading={del.isPending} onClick={() => del.mutate()}>
          {t('confirm')}
        </Button>
        <a className="osia-btn osia-btn--ghost osia-btn--sm" href="/">
          {t('cancel')}
        </a>
      </div>
    </div>
  );
}
