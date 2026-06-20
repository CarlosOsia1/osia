'use client';

import { useEffect, useState } from 'react';
import { BIOMES, type WeatherKind } from '@osia/atmosphere';
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
 * También acelera/pausa el ciclo día/noche. Overlay HTML. Toggle con la tecla "b".
 */

const CHAMPAN = '#cbb89a';
const DIM = '#8c7b66';

const WEATHERS: { kind: WeatherKind; label: string }[] = [
  { kind: 'despejado', label: 'Despejado' },
  { kind: 'lluvia', label: 'Lluvia' },
  { kind: 'nieve', label: 'Nieve' },
  { kind: 'tormenta-arena', label: 'Arena' },
  { kind: 'niebla', label: 'Niebla' },
];

const SPEEDS = [
  { v: 1, label: '×1' },
  { v: 10, label: '×10' },
  { v: 60, label: '×60' },
  { v: 240, label: '×240' },
];

function Btn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '5px 9px',
        fontSize: 11,
        letterSpacing: '0.04em',
        cursor: 'pointer',
        color: active ? '#0d0d0d' : CHAMPAN,
        background: active ? CHAMPAN : 'transparent',
        border: `1px solid ${active ? CHAMPAN : 'rgba(203,184,154,0.3)'}`,
        borderRadius: 7,
        fontFamily: 'inherit',
      }}
    >
      {children}
    </button>
  );
}

export default function AtmosphereTestPanel() {
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
    <div
      style={{
        position: 'absolute',
        bottom: 20,
        right: 20,
        width: 232,
        padding: '12px 14px',
        background: 'rgba(13,13,13,0.72)',
        backdropFilter: 'blur(7px)',
        border: '1px solid rgba(203,184,154,0.18)',
        borderRadius: 12,
        color: CHAMPAN,
        font: "11px/1.5 ui-monospace, 'SF Mono', Menlo, monospace",
        userSelect: 'none',
      }}
    >
      <div style={{ color: DIM, textTransform: 'uppercase', letterSpacing: '0.22em', fontSize: 9, marginBottom: 10 }}>
        OSIA · test atmósfera · (b)
      </div>

      {/* Estado actual + volver al server */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 11 }}>
        <span style={{ color: DIM }}>
          {overriding ? 'preview local' : 'en vivo'} · {world.weather.kind} {shownPct}%
        </span>
        <Btn active={!overriding} onClick={goLive}>
          En vivo
        </Btn>
      </div>

      <div style={{ color: DIM, marginBottom: 5 }}>Bioma</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 11 }}>
        {BIOMES.map((b) => (
          <Btn key={b.id} active={biomeSel === b.id} onClick={() => pickBiome(b.id)}>
            {b.name}
          </Btn>
        ))}
      </div>

      <div style={{ color: DIM, marginBottom: 5 }}>Clima {overriding ? '(override)' : '(server)'}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 11 }}>
        {WEATHERS.map((w) => (
          <Btn key={w.kind} active={weatherSel === w.kind} onClick={() => pickWeather(w.kind)}>
            {w.label}
          </Btn>
        ))}
      </div>

      <div style={{ color: DIM, marginBottom: 5 }}>Tiempo (20 min/ciclo)</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
        {SPEEDS.map((s) => (
          <Btn key={s.v} active={speed === s.v} onClick={() => pickSpeed(s.v)}>
            {s.label}
          </Btn>
        ))}
        <Btn
          active={speed === 'pause'}
          onClick={() => {
            setSpeed('pause');
            setPaused(true);
          }}
        >
          ⏸
        </Btn>
        <Btn
          active={speed === 'real'}
          onClick={() => {
            setSpeed('real');
            resetClock();
          }}
        >
          real
        </Btn>
      </div>
    </div>
  );
}
