'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Field, FormError, Switch, useTheme } from '@osia/ui';
import {
  ACCENT_PALETTE,
  AVATAR_STYLES,
  type AccentColor,
  type AvatarStyle,
  type ReducedMotionPref,
  type UpdatePrefsInput,
} from '@osia/shared';
import { OSIA_SESSION_KEY } from '@osia/identity';
import { identity } from '../../lib/identity';

type Draft = { displayName: string; bio: string; accentColor: AccentColor };
const PROFILE_KEY = ['osia', 'profile'] as const;
const AVATAR_KEY = ['osia', 'avatar'] as const;
const DEFAULT_STYLE: AvatarStyle = 'sereno';
const MOTION_PREFS: readonly ReducedMotionPref[] = ['system', 'reduce', 'allow'];

/** Pasaporte (S1.6-H1): ver/editar perfil (nombre, bio, acento de paleta) + cerrar sesión. */
export function PassportEditor() {
  const t = useTranslations('passport');
  const queryClient = useQueryClient();
  const theme = useTheme();
  const profileQuery = useQuery({ queryKey: PROFILE_KEY, queryFn: () => identity.getMyProfile(), retry: false });
  const [draft, setDraft] = useState<Draft | null>(null);
  const [volume, setVolume] = useState<number | null>(null);
  const syncedRef = useRef(false);

  useEffect(() => {
    if (profileQuery.data && !draft) {
      const p = profileQuery.data;
      const accent = (ACCENT_PALETTE as readonly string[]).includes(p.accentColor)
        ? (p.accentColor as AccentColor)
        : ACCENT_PALETTE[0];
      setDraft({ displayName: p.displayName, bio: p.bio ?? '', accentColor: accent });
      setVolume(p.prefs.volume);
    }
  }, [profileQuery.data, draft]);

  // Aplica las prefs del servidor al theme (movimiento/sonido en vivo) una sola vez al cargar.
  useEffect(() => {
    if (profileQuery.data && !syncedRef.current) {
      syncedRef.current = true;
      theme.setSoundEnabled(profileQuery.data.prefs.sound);
      theme.setReducedMotionPref(profileQuery.data.prefs.reducedMotion);
    }
  }, [profileQuery.data, theme]);

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

  const avatarQuery = useQuery({ queryKey: AVATAR_KEY, queryFn: () => identity.getMyAvatar(), retry: false });
  const rawStyle = avatarQuery.data?.config.style;
  const currentStyle: AvatarStyle =
    typeof rawStyle === 'string' && (AVATAR_STYLES as readonly string[]).includes(rawStyle)
      ? (rawStyle as AvatarStyle)
      : DEFAULT_STYLE;
  const saveStyle = useMutation({
    mutationFn: (style: AvatarStyle) => identity.updateMyAvatar({ style }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: AVATAR_KEY }),
  });

  const savePrefs = useMutation({
    mutationFn: (patch: UpdatePrefsInput) => identity.updateMyProfile({ prefs: patch }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: PROFILE_KEY }),
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
            <p style={{ margin: 'var(--space-1) 0 0', fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
              {t(`style_${currentStyle}`)}
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
        <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
          <span className="osia-overline">{t('avatarStyle')}</span>
          <div role="group" aria-label={t('avatarStyle')} style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
            {AVATAR_STYLES.map((style) => (
              <button
                key={style}
                type="button"
                aria-pressed={currentStyle === style}
                disabled={saveStyle.isPending}
                onClick={() => saveStyle.mutate(style)}
                className={currentStyle === style ? 'osia-btn osia-btn--primary osia-btn--sm' : 'osia-btn osia-btn--ghost osia-btn--sm'}
              >
                {t(`style_${style}`)}
              </button>
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

      <Card pad>
        <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
          <span className="osia-overline">{t('settings')}</span>

          <Switch
            label={t('sound')}
            checked={theme.soundEnabled}
            onChange={(on) => {
              theme.setSoundEnabled(on);
              savePrefs.mutate({ sound: on });
            }}
          />

          <div style={{ display: 'grid', gap: 'var(--space-1)' }}>
            <label htmlFor="osia-volume" style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text)' }}>
              {t('volume')}
            </label>
            <input
              id="osia-volume"
              className="osia-range"
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={volume ?? profile.prefs.volume}
              disabled={!theme.soundEnabled}
              onChange={(e) => setVolume(e.currentTarget.valueAsNumber)}
              onPointerUp={() => {
                if (volume !== null) savePrefs.mutate({ volume });
              }}
              onBlur={() => {
                if (volume !== null) savePrefs.mutate({ volume });
              }}
            />
          </div>

          <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text)' }}>{t('reducedMotion')}</span>
            <div role="group" aria-label={t('reducedMotion')} style={{ display: 'flex', gap: 'var(--space-2)' }}>
              {MOTION_PREFS.map((pref) => (
                <button
                  key={pref}
                  type="button"
                  aria-pressed={theme.reducedMotionPref === pref}
                  onClick={() => {
                    theme.setReducedMotionPref(pref);
                    savePrefs.mutate({ reducedMotion: pref });
                  }}
                  className={
                    theme.reducedMotionPref === pref
                      ? 'osia-btn osia-btn--primary osia-btn--sm'
                      : 'osia-btn osia-btn--ghost osia-btn--sm'
                  }
                >
                  {t(`rm_${pref}`)}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gap: 'var(--space-1)' }}>
            <Switch
              label={t('mic')}
              checked={profile.prefs.micOptIn}
              onChange={(on) => savePrefs.mutate({ micOptIn: on })}
            />
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-subtle)' }}>{t('micHelp')}</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
