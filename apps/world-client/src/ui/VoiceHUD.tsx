'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button, Dot, HudPanel, Panel, Text } from '@osia/ui';
import { useNetState } from '../net/useNet';
import { isChatTyping } from '../net/store';
import { meshVoice } from '../voice/MeshVoice';
import { VOICE_FLAG, hasVoiceFlag } from '@osia/shared';

/**
 * VoiceHUD (S0.6) — control de voz P2P. El micrófono se pide SOLO con un gesto
 * (priming de autoplay/AudioContext). Indicador PERSISTENTE de "voz activa" (privacidad)
 * + indicador en vivo de "hablando". VAD por defecto, PTT con tecla V.
 * Estética OSIA vía primitivas/tokens de @osia/ui (Button/Dot/Panel; sin estilos propios).
 */
export default function VoiceHUD() {
  const { remotes, voice, status } = useNetState();
  const t = useTranslations('voice');
  const [micOn, setMicOn] = useState(false);
  const [mode, setMode] = useState<'vad' | 'ptt'>('vad');
  const [muted, setMuted] = useState(false);
  const [deafened, setDeafened] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [level, setLevel] = useState(0); // nivel del mic (diagnóstico)
  const [error, setError] = useState<'mic' | 'https' | null>(null); // código i18n, no copy
  const [secure, setSecure] = useState(true);

  useEffect(() => {
    setSecure(typeof window === 'undefined' ? true : window.isSecureContext);
  }, []);

  // Indicador propio de "hablando" + nivel del mic (poll).
  useEffect(() => {
    if (!micOn) return;
    const t = setInterval(() => {
      setSpeaking(meshVoice.isSpeaking());
      setLevel(meshVoice.micLevel());
    }, 100);
    return () => clearInterval(t);
  }, [micOn]);

  // Push-to-talk: mantener V (sólo en modo PTT, y no mientras se escribe en el chat).
  useEffect(() => {
    if (!micOn || mode !== 'ptt') return;
    const down = (e: KeyboardEvent) => {
      if (e.code === 'KeyV' && !e.repeat && !isChatTyping()) meshVoice.setPushing(true);
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === 'KeyV') meshVoice.setPushing(false);
    };
    const release = () => meshVoice.setPushing(false); // alt-tab / pestaña oculta: el keyup no llega
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', release);
    document.addEventListener('visibilitychange', release);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', release);
      document.removeEventListener('visibilitychange', release);
      meshVoice.setPushing(false);
    };
  }, [micOn, mode]);

  if (status !== 'connected') return null;

  const enable = async () => {
    const ok = await meshVoice.enableMic();
    if (ok) {
      setMicOn(true);
      setError(null);
    } else {
      setError(secure ? 'mic' : 'https');
    }
  };
  const toggleMode = () => {
    const m = mode === 'vad' ? 'ptt' : 'vad';
    setMode(m);
    meshVoice.setMode(m);
  };
  const toggleMute = () => {
    const m = !muted;
    setMuted(m);
    meshVoice.setMuted(m);
  };
  const toggleDeafen = () => {
    const d = !deafened;
    setDeafened(d);
    meshVoice.setDeafened(d);
  };

  const speakers = remotes.filter((r) => hasVoiceFlag(voice[r.id] ?? 0, VOICE_FLAG.SPEAKING));

  return (
    <HudPanel
      style={{
        bottom: 22,
        right: 28,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: 6,
      }}
      aria-label={t('aria')}
    >
      {/* Quién está hablando ahora (de los remotos) */}
      {speakers.length > 0 && (
        <Panel style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px' }}>
          <Dot color="var(--color-success)" />
          <Text variant="body" style={{ fontWeight: 500 }}>
            {speakers.map((s) => s.handle).join(', ')}
          </Text>
        </Panel>
      )}

      {!micOn ? (
        <>
          <Button variant="primary" onClick={() => void enable()} disabled={!secure}>
            🎙 {t('enable')}
          </Button>
          {error && (
            <Text variant="body" style={{ color: 'var(--color-danger)', maxWidth: 200, textAlign: 'right' }}>
              {t(error === 'https' ? 'errorHttps' : 'errorMic')}
            </Text>
          )}
        </>
      ) : (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {/* Indicador persistente de privacidad: tu mic está activo */}
          <span
            title={speaking ? t('speaking') : t('micActive')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '5px 10px',
              borderRadius: 'var(--radius-md)',
              background: muted ? 'var(--color-danger-soft)' : 'var(--color-accent-soft)',
            }}
          >
            <Dot
              color={
                muted
                  ? 'var(--color-danger)'
                  : speaking
                    ? 'var(--color-success)'
                    : 'var(--color-text-subtle)'
              }
            />
            <Text variant="overline" tone="accent">
              {muted ? t('micOff') : t('active')}
            </Text>
          </span>
          {/* Medidor de nivel del mic (diagnóstico: si se mueve al hablar, el mic captura). */}
          <span
            style={{
              width: 44,
              height: 6,
              borderRadius: 'var(--radius-sm)',
              background: 'var(--color-track)',
              overflow: 'hidden',
            }}
            title={t('micLevel')}
          >
            <span
              style={{
                display: 'block',
                height: '100%',
                width: `${Math.min(100, level * 300)}%`,
                background: speaking ? 'var(--color-success)' : 'var(--color-accent)',
                transition: 'width .1s linear',
              }}
            />
          </span>
          <Button onClick={toggleMute}>{muted ? t('unmute') : t('mute')}</Button>
          <Button onClick={toggleDeafen}>{deafened ? t('undeafen') : t('deafen')}</Button>
          <Button
            onClick={toggleMode}
            active={mode === 'ptt'}
            title={mode === 'ptt' ? t('pttHint') : ''}
          >
            {mode === 'vad' ? t('modeAuto') : t('modePtt')}
          </Button>
        </div>
      )}
    </HudPanel>
  );
}
