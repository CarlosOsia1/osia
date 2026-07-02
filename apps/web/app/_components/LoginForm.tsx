'use client';

import { useId, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Field, FormError, PasswordField, Text } from '@osia/ui';
import { OSIA_SESSION_KEY, OsiaApiError, resolvePostLoginUrl } from '@osia/identity';
import { identity } from '../../lib/identity';
import { experienceUrl } from '../../lib/experienceUrl';

/** Login por email + contraseña (S1.3-H3 UI). Al entrar, al pasaporte (Vestíbulo de S1.7). */
export function LoginForm() {
  const t = useTranslations('login');
  const router = useRouter();
  const queryClient = useQueryClient();
  const emailId = useId();
  const pwId = useId();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const mutation = useMutation({
    mutationFn: () => identity.login({ email, password }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: OSIA_SESSION_KEY });
      // Destino post-login: ?returnTo= (deep-link cross-app de social/games) o ?next= (del middleware).
      // resolvePostLoginUrl acepta rutas internas y URLs absolutas SOLO de dominios del ecosistema
      // (allowlist) — cierra el open redirect (?next=//evil.com) y arregla el retorno a la app social.
      const params = new URLSearchParams(window.location.search);
      const dest = resolvePostLoginUrl(params.get('returnTo') ?? params.get('next'), {
        allowedOrigins: [experienceUrl('world'), experienceUrl('social')],
        fallback: '/',
      });
      if (dest.startsWith('/')) router.push(dest);
      else window.location.href = dest; // otra app del ecosistema (la sesión viaja por cookie .osia.*)
    },
  });

  function onSubmit(e: FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    mutation.mutate();
  }

  const error =
    mutation.isError && mutation.error instanceof OsiaApiError
      ? mutation.error.code === 'EMAIL_NOT_VERIFIED'
        ? t('errUnverified')
        : mutation.error.code === 'INVALID_CREDENTIALS'
          ? t('errCredentials')
          : t('errGeneric')
      : mutation.isError
        ? t('errGeneric')
        : null;

  return (
    <form onSubmit={onSubmit} noValidate style={{ display: 'grid', gap: 'var(--space-4)' }}>
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
      <div style={{ display: 'grid', gap: 'var(--space-1)', textAlign: 'left' }}>
        <Text as="label" variant="caption" htmlFor={pwId}>
          {t('passwordLabel')}
        </Text>
        <PasswordField
          id={pwId}
          name="current-password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.currentTarget.value)}
          showLabel={t('show')}
          hideLabel={t('hide')}
          required
        />
      </div>
      <Button type="submit" variant="primary" size="lg" loading={mutation.isPending}>
        {t('submit')}
      </Button>
      {error && <FormError style={{ textAlign: 'center' }}>{error}</FormError>}
      <div style={{ textAlign: 'center' }}>
        <a
          className="osia-btn osia-btn--ghost osia-btn--sm"
          href={email ? `/recuperar?email=${encodeURIComponent(email)}` : '/recuperar'}
        >
          {t('forgot')}
        </a>
      </div>
    </form>
  );
}
