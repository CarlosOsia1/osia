'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { Button, Panel, Text } from '@osia/ui';
import { BIOMES, WEATHER_KINDS, seasonAt, seasonPeak, type SeasonId, type WeatherKind } from '@osia/atmosphere';
import {
  world,
  setOverrideBiome,
  setOverrideWeather,
  clearOverrides,
  isOverriding,
} from './atmosphereRuntime';
import { worldClock, setTimeScale, setPaused, setTimeOfYear, resetClock } from './worldClockRuntime';

/** Orden de las estaciones; el panel salta al PUNTO MEDIO (máxima expresión) de cada una. */
const SEASON_IDS: readonly SeasonId[] = ['primavera', 'verano', 'otono', 'invierno'];

/**
 * AtmosphereTestPanel — controles de TEST (se quitan luego). El clima REAL lo dicta
 * el server (sincronizado entre todos); aquí puedes hacer un PREVIEW LOCAL de bioma y
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

const rowStyle = { display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 11 } as const;

/** Etiqueta de sección del panel (texto vía componente, §2.5). */
function Label({ children }: { children: ReactNode }) {
  return (
    <Text variant="label" tone="subtle" style={{ display: 'block', marginBottom: 5 }}>
      {children}
    </Text>
  );
}

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
      <Text variant="overline" tone="subtle" style={{ display: 'block', marginBottom: 10 }}>
        {t('atmoTitle')}
      </Text>

      {/* Estado actual + volver al server */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 11,
        }}
      >
        <Text variant="body" tone="subtle">
          {overriding ? t('previewLocal') : t('live')} · {t(`weather.${world.weather.kind}`)} {shownPct}%
        </Text>
        <Button size="sm" active={!overriding} onClick={goLive}>
          {t('liveAction')}
        </Button>
      </div>

      <Label>{t('biome')}</Label>
      <div style={rowStyle}>
        {BIOMES.map((b) => (
          <Button key={b.id} size="sm" active={biomeSel === b.id} onClick={() => pickBiome(b.id)}>
            {b.name}
          </Button>
        ))}
      </div>

      <Label>
        {t('weatherLabel')} ({overriding ? t('sourceOverride') : t('sourceServer')})
      </Label>
      <div style={rowStyle}>
        {WEATHER_KINDS.map((k) => (
          <Button key={k} size="sm" active={weatherSel === k} onClick={() => pickWeather(k)}>
            {t(`weather.${k}`)}
          </Button>
        ))}
      </div>

      <Label>{t('season')}</Label>
      <div style={rowStyle}>
        {SEASON_IDS.map((id) => (
          <Button
            key={id}
            size="sm"
            active={seasonAt(worldClock.toy).id === id}
            onClick={() => {
              setTimeOfYear(seasonPeak(id)); // salta a la máxima expresión de la estación
              refresh();
            }}
          >
            {t(`seasons.${id}`)}
          </Button>
        ))}
      </div>

      <Label>{t('timeScale')}</Label>
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
