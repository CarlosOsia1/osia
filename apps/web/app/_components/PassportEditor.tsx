'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Field, FormError } from '@osia/ui';
import { ACCENT_PALETTE, type AccentColor } from '@osia/shared';
import { OSIA_SESSION_KEY } from '@osia/identity';
import { identity } from '../../lib/identity';

type Draft = { displayName: string; bio: string; accentColor: AccentColor };
const PROFILE_KEY = ['osia', 'profile'] as const;

/** Pasaporte (S1.6-H1): ver/editar perfil (nombre, bio, acento de paleta) + cerrar sesión. */
export function PassportEditor() {
  const t = useTranslations('passport');
  const queryClient = useQueryClient();
  const profileQuery = useQuery({ queryKey: PROFILE_KEY, queryFn: () => identity.getMyProfile(), retry: false });
  const [draft, setDraft] = useState<Draft | null>(null);

  useEffect(() => {
    if (profileQuery.data && !draft) {
      const p = profileQuery.data;
      const accent = (ACCENT_PALETTE as readonly string[]).includes(p.accentColor)
        ? (p.accentColor as AccentColor)
        : ACCENT_PALETTE[0];
      setDraft({ displayName: p.displayName, bio: p.bio ?? '', accentColor: accent });
    }
  }, [profileQuery.data, draft]);

  const save = useMutation({
    mutationFn: (d: Draft) =>
      identity.updateMyProfile({
        displayName: d.displayName,
        bio: d.bio || undefined,
        accentColor: d.accentColor,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: PROFILE_KEY });
      void queryClient.invalidateQueries({ queryKey: OSIA_SESSION_KEY });
    },
  });

  if (profileQuery.isError) {
    return (
      <Card pad>
        <p style={{ marginTop: 0, color: 'var(--color-text-muted)' }}>{t('needLogin')}</p>
        <a className="osia-btn osia-btn--primary" href="/login">
          {t('toLogin')}
        </a>
      </Card>
    );
  }
  if (!draft || !profileQuery.data) {
    return <p style={{ color: 'var(--color-text-muted)' }}>{t('loading')}</p>;
  }
  const profile = profileQuery.data;

  function onSubmit(e: FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    if (draft) save.mutate(draft);
  }

  return (
    <div style={{ display: 'grid', gap: 'var(--space-5)' }}>
      <Card pad>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
          <div
            aria-hidden
            style={{
              inlineSize: 'var(--space-9)',
              blockSize: 'var(--space-9)',
              borderRadius: 'var(--radius-full)',
              background: draft.accentColor,
              flex: 'none',
            }}
          />
          <div>
            <p className="osia-overline" style={{ margin: 0 }}>
              @{profile.handle}
            </p>
            <p
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'var(--text-xl)',
                margin: 'var(--space-1) 0 0',
                color: 'var(--color-text-strong)',
              }}
            >
              {draft.displayName || profile.displayName}
            </p>
          </div>
        </div>
      </Card>

      <form onSubmit={onSubmit} style={{ display: 'grid', gap: 'var(--space-4)' }}>
        <div style={{ display: 'grid', gap: 'var(--space-1)' }}>
          <span className="osia-overline">{t('displayName')}</span>
          <Field value={draft.displayName} maxLength={40} onChange={(e) => setDraft({ ...draft, displayName: e.currentTarget.value })} />
        </div>
        <div style={{ display: 'grid', gap: 'var(--space-1)' }}>
          <span className="osia-overline">{t('bio')}</span>
          <Field value={draft.bio} maxLength={280} onChange={(e) => setDraft({ ...draft, bio: e.currentTarget.value })} />
        </div>
        <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
          <span className="osia-overline">{t('accent')}</span>
          <div role="group" aria-label={t('accent')} style={{ display: 'flex', gap: 'var(--space-2)' }}>
            {ACCENT_PALETTE.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={c}
                aria-pressed={draft.accentColor === c}
                onClick={() => setDraft({ ...draft, accentColor: c })}
                style={{
                  inlineSize: 'var(--space-6)',
                  blockSize: 'var(--space-6)',
                  borderRadius: 'var(--radius-full)',
                  background: c,
                  cursor: 'pointer',
                  border:
                    draft.accentColor === c
                      ? '2px solid var(--color-focus-ring)'
                      : '1px solid var(--color-border)',
                }}
              />
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
          <Button type="submit" variant="primary" loading={save.isPending}>
            {t('save')}
          </Button>
          {save.isSuccess && (
            <span style={{ color: 'var(--color-success)', fontSize: 'var(--text-sm)' }}>{t('saved')}</span>
          )}
          <button
            type="button"
            className="osia-btn osia-btn--ghost"
            onClick={() => void identity.logout().finally(() => (window.location.href = '/'))}
          >
            {t('logout')}
          </button>
        </div>
        {save.isError && <FormError>{t('errSave')}</FormError>}
      </form>
    </div>
  );
}
