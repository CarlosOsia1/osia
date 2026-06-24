'use client';

import { useState, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { useMutation } from '@tanstack/react-query';
import { Button, Field } from '@osia/ui';
import { OsiaApiError } from '@osia/identity';
import type { SignupInput } from '@osia/shared';
import { identity } from '../../lib/identity';

/** Formulario de registro por invitación (S1.4-H4). El gate real es server-side; acá UX. */
export function SignupForm({ initialCode }: { initialCode: string }) {
  const t = useTranslations('signup');
  const [form, setForm] = useState({
    code: initialCode,
    email: '',
    handle: '',
    displayName: '',
    password: '',
  });
  const mutation = useMutation({
    mutationFn: (input: SignupInput) => identity.signup(input),
  });

  const set = (key: keyof typeof form) => (e: { currentTarget: { value: string } }) =>
    setForm((f) => ({ ...f, [key]: e.currentTarget.value }));

  function onSubmit(e: FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    mutation.mutate({ ...form });
  }

  if (mutation.isSuccess) {
    return (
      <p role="status" style={{ color: 'var(--color-accent)', fontFamily: 'var(--font-ui)', textAlign: 'center' }}>
        {t('success')}
      </p>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      style={{ display: 'grid', gap: 'var(--space-3)', maxWidth: '24rem', margin: '0 auto' }}
    >
      <Field placeholder={t('code')} aria-label={t('code')} value={form.code} onChange={set('code')} required />
      <Field type="email" autoComplete="email" placeholder={t('email')} aria-label={t('email')} value={form.email} onChange={set('email')} required />
      <Field placeholder={t('handle')} aria-label={t('handle')} value={form.handle} onChange={set('handle')} required />
      <Field placeholder={t('displayName')} aria-label={t('displayName')} value={form.displayName} onChange={set('displayName')} required />
      <Field type="password" autoComplete="new-password" placeholder={t('password')} aria-label={t('password')} value={form.password} onChange={set('password')} required />
      <Button type="submit" variant="primary" size="lg" loading={mutation.isPending}>
        {t('submit')}
      </Button>
      {mutation.isError && (
        <p role="alert" style={{ color: 'var(--color-danger)', fontSize: 'var(--text-sm)', margin: 0 }}>
          {errorLabel(mutation.error, t)}
        </p>
      )}
    </form>
  );
}

function errorLabel(error: unknown, t: (key: string) => string): string {
  if (error instanceof OsiaApiError) {
    switch (error.code) {
      case 'NOT_INVITED':
        return t('errInvite');
      case 'INVITATION_EXPIRED':
        return t('errExpired');
      case 'HANDLE_TAKEN':
        return t('errHandle');
      case 'VALIDATION_FAILED':
        return t('errValidation');
    }
  }
  return t('errGeneric');
}
