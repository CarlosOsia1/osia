'use client';

import { useId, useState, type FormEvent, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useMutation } from '@tanstack/react-query';
import { Button, Field } from '@osia/ui';
import { OsiaApiError } from '@osia/identity';
import { HANDLE_PATTERN, type SignupInput } from '@osia/shared';
import { identity } from '../../lib/identity';

/** Sanea el nombre de usuario en vivo: solo a-z 0-9 _, minúsculas, sin espacios ni símbolos. */
const sanitizeUsername = (v: string): string =>
  v.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20);

type Form = {
  code: string;
  email: string;
  username: string;
  displayName: string;
  password: string;
  confirm: string;
};

/** Formulario de registro por invitación (S1.4-H4): labels, saneo de usuario, confirmar
 *  contraseña y ver/ocultar. El gate invite-only es server-side. */
export function SignupForm({ initialCode }: { initialCode: string }) {
  const t = useTranslations('signup');
  const router = useRouter();
  const [form, setForm] = useState<Form>({
    code: initialCode,
    email: '',
    username: '',
    displayName: '',
    password: '',
    confirm: '',
  });
  const [showPw, setShowPw] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (input: SignupInput) => identity.signup(input),
    onSuccess: () => router.push(`/verify?email=${encodeURIComponent(form.email)}`),
  });

  const set =
    (key: keyof Form, transform?: (v: string) => string) =>
    (e: { currentTarget: { value: string } }) => {
      const raw = e.currentTarget.value;
      const value = transform ? transform(raw) : raw;
      setForm((f) => ({ ...f, [key]: value }));
    };

  function validate(): string | null {
    if (!HANDLE_PATTERN.test(form.username)) return t('errUsername');
    if (form.password.length < 8) return t('errPasswordShort');
    if (form.password !== form.confirm) return t('errPasswordMatch');
    return null;
  }

  function onSubmit(e: FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    const err = validate();
    setClientError(err);
    if (err) return;
    mutation.mutate({
      code: form.code.trim(),
      email: form.email,
      handle: form.username,
      displayName: form.displayName,
      password: form.password,
    });
  }

  const error = clientError ?? (mutation.isError ? errorLabel(mutation.error, t) : null);
  const pwType = showPw ? 'text' : 'password';

  return (
    <form onSubmit={onSubmit} noValidate style={{ display: 'grid', gap: 'var(--space-4)' }}>
      <Labeled label={t('codeLabel')}>
        {(id) => (
          <Field id={id} name="invitation-code" autoComplete="off" value={form.code} onChange={set('code')} required />
        )}
      </Labeled>
      <Labeled label={t('emailLabel')}>
        {(id) => (
          <Field
            id={id}
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            value={form.email}
            onChange={set('email')}
            required
          />
        )}
      </Labeled>
      <Labeled label={t('usernameLabel')} help={t('usernameHelp')}>
        {(id) => (
          <Field
            id={id}
            name="username"
            value={form.username}
            onChange={set('username', sanitizeUsername)}
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            required
          />
        )}
      </Labeled>
      <Labeled label={t('nameLabel')}>
        {(id) => (
          <Field id={id} name="name" autoComplete="name" value={form.displayName} onChange={set('displayName')} required />
        )}
      </Labeled>
      <Labeled label={t('passwordLabel')}>
        {(id) => (
          <PasswordRow
            id={id}
            name="new-password"
            type={pwType}
            value={form.password}
            onChange={set('password')}
            autoComplete="new-password"
            toggleLabel={showPw ? t('hide') : t('show')}
            onToggle={() => setShowPw((s) => !s)}
          />
        )}
      </Labeled>
      <Labeled label={t('confirmLabel')}>
        {(id) => (
          <PasswordRow
            id={id}
            name="confirm-password"
            type={pwType}
            value={form.confirm}
            onChange={set('confirm')}
            autoComplete="new-password"
            toggleLabel={showPw ? t('hide') : t('show')}
            onToggle={() => setShowPw((s) => !s)}
          />
        )}
      </Labeled>

      <Button type="submit" variant="primary" size="lg" loading={mutation.isPending}>
        {t('submit')}
      </Button>
      {error && (
        <p role="alert" style={{ color: 'var(--color-danger)', fontSize: 'var(--text-sm)', margin: 0, textAlign: 'center' }}>
          {error}
        </p>
      )}
    </form>
  );
}

/** Campo con label y ayuda opcional (accesible). */
function Labeled({
  label,
  help,
  children,
}: {
  label: string;
  help?: string;
  children: (id: string) => ReactNode;
}) {
  const id = useId();
  return (
    <div style={{ display: 'grid', gap: 'var(--space-1)', textAlign: 'left' }}>
      <label htmlFor={id} className="osia-overline">
        {label}
      </label>
      {children(id)}
      {help && (
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-subtle)' }}>{help}</span>
      )}
    </div>
  );
}

/** Input de contraseña con botón ver/ocultar. */
function PasswordRow({
  id,
  name,
  type,
  value,
  onChange,
  autoComplete,
  toggleLabel,
  onToggle,
}: {
  id: string;
  name: string;
  type: 'text' | 'password';
  value: string;
  onChange: (e: { currentTarget: { value: string } }) => void;
  autoComplete: string;
  toggleLabel: string;
  onToggle: () => void;
}) {
  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      <Field id={id} name={name} type={type} value={value} onChange={onChange} autoComplete={autoComplete} required />
      <button
        type="button"
        onClick={onToggle}
        className="osia-btn osia-btn--ghost osia-btn--sm"
        style={{ position: 'absolute', right: 'var(--space-1)' }}
      >
        {toggleLabel}
      </button>
    </div>
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
