'use client';

import { useId, useState, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, CodeInput, Field, FormError, PasswordField, Text } from '@osia/ui';
import { EMAIL_OTP_LENGTH, resetPasswordSchema } from '@osia/shared';
import { OSIA_SESSION_KEY, OsiaApiError } from '@osia/identity';
import { identity } from '../../lib/identity';

/**
 * Recuperación de contraseña en dos pasos (V1 Vestíbulo): email → OTP + contraseña nueva.
 * El paso 1 responde 204 SIEMPRE (sin oráculo de emails); al confirmar, auto-login como verify.
 */
export function RecoverForm({ initialEmail }: { initialEmail: string }) {
  const t = useTranslations('recover');
  const queryClient = useQueryClient();
  const emailId = useId();
  const pw1Id = useId();
  const pw2Id = useId();
  const [step, setStep] = useState<'request' | 'reset'>('request');
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState('');
  const [pw1, setPw1] = useState('');
  const [pw2, setPw2] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const send = useMutation({
    mutationFn: () => identity.forgotPassword(email),
    onSuccess: () => setStep('reset'),
  });
  // Instancia aparte para el reenvío: si compartiera `send`, un re-mutate resetearía su estado
  // y la UI volvería al paso 1 mientras reenvía.
  const resend = useMutation({ mutationFn: () => identity.forgotPassword(email) });
  const reset = useMutation({
    mutationFn: () => identity.resetPassword({ email, token: code, newPassword: pw1 }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: OSIA_SESSION_KEY }),
  });

  function onSubmitRequest(e: FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    send.mutate();
  }

  function onSubmitReset(e: FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    if (pw1 !== pw2) {
      setLocalError(t('errMismatch'));
      return;
    }
    // Fail-fast con el MISMO esquema del servidor (§5): la única regla restante es la contraseña.
    const parsed = resetPasswordSchema.safeParse({ email, token: code, newPassword: pw1 });
    if (!parsed.success) {
      setLocalError(t('errWeak'));
      return;
    }
    setLocalError(null);
    reset.mutate();
  }

  if (reset.isSuccess) {
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

  if (step === 'request') {
    return (
      <form onSubmit={onSubmitRequest} noValidate style={{ display: 'grid', gap: 'var(--space-4)' }}>
        <Text as="p" variant="read" tone="muted" style={{ textAlign: 'center' }}>
          {t('intro')}
        </Text>
        <div style={{ display: 'grid', gap: 'var(--space-1)', textAlign: 'left' }}>
          <Text as="label" variant="caption" htmlFor={emailId}>
            {t('emailLabel')}
          </Text>
          <Field
            id={emailId}
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.currentTarget.value)}
            required
          />
        </div>
        <Button type="submit" variant="primary" size="lg" loading={send.isPending}>
          {t('sendCode')}
        </Button>
        {send.isError && <FormError style={{ textAlign: 'center' }}>{t('errGeneric')}</FormError>}
        <div style={{ textAlign: 'center' }}>
          <a className="osia-btn osia-btn--ghost osia-btn--sm" href="/login">
            {t('backToLogin')}
          </a>
        </div>
      </form>
    );
  }

  // El 422 del API tras el pre-chequeo local solo queda para `same_password` (contraseña repetida).
  const apiError = reset.isError
    ? reset.error instanceof OsiaApiError && reset.error.code === 'TOKEN_EXPIRED'
      ? t('errInvalid')
      : reset.error instanceof OsiaApiError && reset.error.code === 'VALIDATION_FAILED'
        ? t('errSame')
        : t('errGeneric')
    : null;
  const errorMsg = localError ?? apiError;

  return (
    <form onSubmit={onSubmitReset} noValidate style={{ display: 'grid', gap: 'var(--space-5)' }}>
      <Text as="p" variant="read" tone="muted" style={{ textAlign: 'center' }}>
        {t('sent', { email })}
      </Text>
      <CodeInput
        length={EMAIL_OTP_LENGTH}
        value={code}
        ariaLabel={t('codeLabel')}
        invalid={reset.isError && apiError === t('errInvalid')}
        onChange={setCode}
      />
      <div style={{ display: 'grid', gap: 'var(--space-1)', textAlign: 'left' }}>
        <Text as="label" variant="caption" htmlFor={pw1Id}>
          {t('newPasswordLabel')}
        </Text>
        <PasswordField
          id={pw1Id}
          name="new-password"
          autoComplete="new-password"
          value={pw1}
          onChange={(e) => setPw1(e.currentTarget.value)}
          showLabel={t('show')}
          hideLabel={t('hide')}
          required
        />
      </div>
      <div style={{ display: 'grid', gap: 'var(--space-1)', textAlign: 'left' }}>
        <Text as="label" variant="caption" htmlFor={pw2Id}>
          {t('confirmPasswordLabel')}
        </Text>
        <PasswordField
          id={pw2Id}
          name="confirm-password"
          autoComplete="new-password"
          value={pw2}
          onChange={(e) => setPw2(e.currentTarget.value)}
          showLabel={t('show')}
          hideLabel={t('hide')}
          required
        />
      </div>
      {errorMsg && <FormError style={{ textAlign: 'center' }}>{errorMsg}</FormError>}
      <div style={{ display: 'grid', gap: 'var(--space-3)', justifyItems: 'center' }}>
        <Button
          type="submit"
          variant="primary"
          size="lg"
          loading={reset.isPending}
          disabled={code.length < EMAIL_OTP_LENGTH || pw1.length === 0 || pw2.length === 0}
        >
          {t('submit')}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          loading={resend.isPending}
          onClick={() => resend.mutate()}
        >
          {resend.isSuccess ? t('resent') : t('resend')}
        </Button>
      </div>
    </form>
  );
}
