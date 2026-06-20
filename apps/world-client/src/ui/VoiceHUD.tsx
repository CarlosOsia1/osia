'use client';

import { useEffect, useState } from 'react';
import { useNetState } from '../net/useNet';
import { isChatTyping } from '../net/store';
import { meshVoice } from '../voice/MeshVoice';
import { VOICE_FLAG, hasVoiceFlag } from '@osia/shared';

/**
 * VoiceHUD (S0.6) — control de voz P2P. El micrófono se pide SOLO con un gesto
 * (priming de autoplay/AudioContext). Indicador PERSISTENTE de "voz activa" (privacidad)
 * + indicador en vivo de "hablando". VAD por defecto, PTT con tecla V.
 */

const DOT = (color: string): React.CSSProperties => ({
  width: 8,
  height: 8,
  borderRadius: '50%',
  background: color,
  display: 'inline-block',
  flex: 'none',
});

export default function VoiceHUD() {
  const { remotes, voice, status } = useNetState();
  const [micOn, setMicOn] = useState(false);
  const [mode, setMode] = useState<'vad' | 'ptt'>('vad');
  const [muted, setMuted] = useState(false);
  const [deafened, setDeafened] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [level, setLevel] = useState(0); // nivel del mic (diagnóstico)
  const [error, setError] = useState<string | null>(null);
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
      setError(secure ? 'no se pudo acceder al micrófono' : 'la voz necesita https');
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

  const btn: React.CSSProperties = {
    pointerEvents: 'auto',
    padding: '5px 10px',
    borderRadius: 8,
    border: '1px solid rgba(203,184,154,0.28)',
    background: 'rgba(20,18,15,0.6)',
    color: '#cbb89a',
    font: '600 11px/1 Jost, system-ui, sans-serif',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    cursor: 'pointer',
  };

  const speakers = remotes.filter((r) => hasVoiceFlag(voice[r.id] ?? 0, VOICE_FLAG.SPEAKING));

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 22,
        right: 28,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: 6,
        pointerEvents: 'none',
        zIndex: 20,
      }}
      aria-label="control de voz"
    >
      {/* Quién está hablando ahora (de los remotos) */}
      {speakers.length > 0 && (
        <div
          style={{
            display: 'flex',
            gap: 6,
            padding: '4px 10px',
            borderRadius: 9,
            background: 'rgba(20,18,15,0.55)',
            color: '#e6dcc8',
            font: '500 12px/1.2 Jost, system-ui, sans-serif',
            backdropFilter: 'blur(4px)',
          }}
        >
          <span style={DOT('#9fd6a0')} />
          {speakers.map((s) => s.handle).join(', ')}
        </div>
      )}

      {!micOn ? (
        <>
          <button type="button" style={btn} onClick={() => void enable()} disabled={!secure}>
            🎙 activar voz
          </button>
          {error && (
            <span style={{ color: '#d8a08f', font: '400 10px/1.2 Jost, system-ui', maxWidth: 200, textAlign: 'right' }}>
              {error}
            </span>
          )}
        </>
      ) : (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {/* Indicador persistente de privacidad: tu mic está activo */}
          <span
            title={speaking ? 'hablando' : 'mic activo'}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '5px 10px',
              borderRadius: 8,
              background: muted ? 'rgba(60,40,40,0.5)' : 'rgba(20,18,15,0.6)',
              color: '#cbb89a',
              font: '600 11px/1 Jost, system-ui, sans-serif',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            <span style={DOT(muted ? '#8c6b66' : speaking ? '#9fd6a0' : '#6b6354')} />
            {muted ? 'mic off' : 'voz activa'}
          </span>
          {/* Medidor de nivel del mic (diagnóstico: si se mueve al hablar, el mic captura). */}
          <span
            style={{ width: 44, height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.12)', overflow: 'hidden' }}
            title="nivel del micrófono"
          >
            <span
              style={{
                display: 'block',
                height: '100%',
                width: `${Math.min(100, level * 300)}%`,
                background: speaking ? '#9fd6a0' : '#cbb89a',
                transition: 'width .1s linear',
              }}
            />
          </span>
          <button type="button" style={btn} onClick={toggleMute}>
            {muted ? 'reactivar' : 'silenciar'}
          </button>
          <button type="button" style={btn} onClick={toggleDeafen}>
            {deafened ? 'oír' : 'ensordecer'}
          </button>
          <button type="button" style={btn} onClick={toggleMode} title={mode === 'ptt' ? 'mantené V para hablar' : ''}>
            {mode === 'vad' ? 'voz: auto' : 'voz: tecla V'}
          </button>
        </div>
      )}
    </div>
  );
}
