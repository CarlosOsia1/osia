'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, CodeInput, FormError, Text } from '@osia/ui';
import { EMAIL_OTP_LENGTH } from '@osia/shared';
import { OSIA_SESSION_KEY, OsiaApiError } from '@osia/identity';
import { identity } from '../../lib/identity';

/** Verificación de email con code-input (S1.5-H1). Auto-login al confirmar. */
export function VerifyForm({ email }: { email: string }) {
  const t = useTranslations('verify');
  const queryClient = useQueryClient();
  const [code, setCode] = useState('');

  const verify = useMutation({
    mutationFn: (token: string) => identity.verifyEmail({ email, token }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: OSIA_SESSION_KEY }),
  });
  const resend = useMutation({ mutationFn: () => identity.resendVerification(email) });

  if (verify.isSuccess) {
    return (
      <div style={{ display: 'grid', gap: 'var(--space-4)', textAlign: 'center' }}>
        <Text as="p" role="status" variant="display">
          {t('success')}
        </Text>
        <div>
          <a className="osia-btn osia-btn--primary osia-btn--lg" href="/">
            {t('enter')}
          </a>
        </div>
      </div>
    );
  }

  const errorMsg =
    verify.isError && verify.error instanceof OsiaApiError && verify.error.code === 'TOKEN_EXPIRED'
      ? t('errInvalid')
      : verify.isError
        ? t('errGeneric')
        : null;

  return (
    <div style={{ display: 'grid', gap: 'var(--space-5)', textAlign: 'center' }}>
      <Text as="p" variant="read" tone="muted">
        {t('sent', { email })}
      </Text>
      <CodeInput
        length={EMAIL_OTP_LENGTH}
        value={code}
        ariaLabel={t('codeLabel')}
        invalid={Boolean(errorMsg)}
        onChange={setCode}
        onComplete={(value) => verify.mutate(value)}
      />
      {errorMsg && <FormError>{errorMsg}</FormError>}
      <div style={{ display: 'grid', gap: 'var(--space-3)', justifyItems: 'center' }}>
        <Button
          variant="primary"
          size="lg"
          loading={verify.isPending}
          disabled={code.length < EMAIL_OTP_LENGTH}
          onClick={() => verify.mutate(code)}
        >
          {t('submit')}
        </Button>
        <Button variant="ghost" size="sm" loading={resend.isPending} onClick={() => resend.mutate()}>
          {resend.isSuccess ? t('resent') : t('resend')}
        </Button>
      </div>
    </div>
  );
}
