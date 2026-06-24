'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button, Panel } from '@osia/ui';
import { BIOMES, WEATHER_KINDS, type WeatherKind } from '@osia/atmosphere';
import {
  world,
  setOverrideBiome,
  setOverrideWeather,
  clearOverrides,
  isOverriding,
} from './atmosphereRuntime';
import { setTimeScale, setPaused, resetClock } from './worldClockRuntime';

/**
 * AtmosphereTestPanel — controles de TEST (se quitan luego). El clima REAL lo dicta
 * el server (sincronizado entre todos); aquí podés hacer un PREVIEW LOCAL de bioma y
 * clima (override) sin afectar a nadie, o volver a "En vivo" para seguir al server.
 *
 * UI por @osia/ui (Button/Panel + tokens); texto vía i18n (@osia/i18n). Toggle: tecla "b".
 */

const SPEEDS = [
  { v: 1, label: '×1' },
  { v: 10, label: '×10' },
  { v: 60, label: '×60' },
  { v: 240, label: '×240' },
];

const labelStyle = { color: 'var(--color-text-subtle)', marginBottom: 5 } as const;
const rowStyle = { display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 11 } as const;

export default function AtmosphereTestPanel() {
  const t = useTranslations('hud');
  const [open, setOpen] = useState(true);
  const [, setTick] = useState(0);
  const [speed, setSpeed] = useState<number | 'pause' | 'real'>('real');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'b' || e.key === 'B') setOpen((v) => !v);
    };
    window.addEventListener('keydown', onKey);
    const id = setInterval(() => setTick((t) => t + 1), 700); // refresca el estado EN VIVO del server
    return () => {
      window.removeEventListener('keydown', onKey);
      clearInterval(id);
    };
  }, []);

  const refresh = () => setTick((t) => t + 1);
  const pickBiome = (id: string) => {
    setOverrideBiome(id);
    refresh();
  };
  const pickWeather = (k: WeatherKind) => {
    setOverrideWeather({ kind: k, intensity: k === 'despejado' ? 0 : 1 });
    refresh();
  };
  const goLive = () => {
    clearOverrides();
    refresh();
  };
  const pickSpeed = (s: number) => {
    setSpeed(s);
    setTimeScale(s);
  };

  if (!open) return null;

  const overriding = isOverriding();
  const biomeSel = world.overrideBiomeId ?? world.liveBiomeId;
  const weatherSel = world.overrideWeather?.kind ?? world.liveWeather.kind;
  const shownPct = Math.round(world.weather.intensity * 100);

  return (
    <Panel
      style={{
        position: 'absolute',
        bottom: 'var(--space-5)',
        right: 'var(--space-5)',
        width: 232,
        padding: '12px 14px',
        font: 'var(--text-sm)/var(--leading-normal) var(--font-ui)',
        userSelect: 'none',
      }}
    >
      <div
        style={{
          color: 'var(--color-text-subtle)',
          textTransform: 'uppercase',
          letterSpacing: 'var(--tracking-overline)',
          fontSize: 'var(--text-2xs)',
          marginBottom: 10,
        }}
      >
        {t('atmoTitle')}
      </div>

      {/* Estado actual + volver al server */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 11,
        }}
      >
        <span style={{ color: 'var(--color-text-subtle)' }}>
          {overriding ? t('previewLocal') : t('live')} · {t(`weather.${world.weather.kind}`)} {shownPct}%
        </span>
        <Button size="sm" active={!overriding} onClick={goLive}>
          {t('liveAction')}
        </Button>
      </div>

      <div style={labelStyle}>{t('biome')}</div>
      <div style={rowStyle}>
        {BIOMES.map((b) => (
          <Button key={b.id} size="sm" active={biomeSel === b.id} onClick={() => pickBiome(b.id)}>
            {b.name}
          </Button>
        ))}
      </div>

      <div style={labelStyle}>
        {t('weatherLabel')} ({overriding ? t('sourceOverride') : t('sourceServer')})
      </div>
      <div style={rowStyle}>
        {WEATHER_KINDS.map((k) => (
          <Button key={k} size="sm" active={weatherSel === k} onClick={() => pickWeather(k)}>
            {t(`weather.${k}`)}
          </Button>
        ))}
      </div>

      <div style={labelStyle}>{t('timeScale')}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
        {SPEEDS.map((s) => (
          <Button key={s.v} size="sm" active={speed === s.v} onClick={() => pickSpeed(s.v)}>
            {s.label}
          </Button>
        ))}
        <Button
          size="sm"
          active={speed === 'pause'}
          aria-label={t('pause')}
          onClick={() => {
            setSpeed('pause');
            setPaused(true);
          }}
        >
          ⏸
        </Button>
        <Button
          size="sm"
          active={speed === 'real'}
          onClick={() => {
            setSpeed('real');
            resetClock();
          }}
        >
          {t('realClock')}
        </Button>
      </div>
    </Panel>
  );
}
