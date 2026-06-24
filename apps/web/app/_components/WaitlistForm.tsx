'use client';

import { useState, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { useMutation } from '@tanstack/react-query';
import { Button, Field } from '@osia/ui';
import { OsiaApiError } from '@osia/identity';
import { identity } from '../../lib/identity';

/** Formulario de waitlist (S1.4-H2): alta idempotente vía apps/api. Confirmación con tono de marca. */
export function WaitlistForm() {
  const t = useTranslations('waitlist');
  const [email, setEmail] = useState('');
  const mutation = useMutation({
    mutationFn: (value: string) => identity.joinWaitlist({ email: value, source: 'landing' }),
  });

  if (mutation.isSuccess) {
    return (
      <p
        role="status"
        style={{ color: 'var(--color-accent)', fontFamily: 'var(--font-ui)', margin: 0 }}
      >
        {t('success')}
      </p>
    );
  }

  function onSubmit(e: FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    const value = email.trim();
    if (value) mutation.mutate(value);
  }

  const errorMsg =
    mutation.isError &&
    mutation.error instanceof OsiaApiError &&
    mutation.error.code === 'ALREADY_QUEUED'
      ? t('duplicate')
      : mutation.isError
        ? t('error')
        : null;

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      style={{ display: 'grid', gap: 'var(--space-3)', maxWidth: '22rem', margin: '0 auto' }}
    >
      <Field
        type="email"
        required
        autoComplete="email"
        placeholder={t('placeholder')}
        aria-label={t('placeholder')}
        value={email}
        onChange={(e) => setEmail(e.currentTarget.value)}
        invalid={Boolean(errorMsg)}
      />
      <Button type="submit" variant="primary" size="lg" loading={mutation.isPending}>
        {t('submit')}
      </Button>
      {errorMsg && (
        <p role="alert" style={{ color: 'var(--color-danger)', fontSize: 'var(--text-sm)', margin: 0 }}>
          {errorMsg}
        </p>
      )}
    </form>
  );
}
