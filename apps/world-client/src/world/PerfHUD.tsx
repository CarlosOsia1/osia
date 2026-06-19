'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { subscribePerf, getPerf, type PerfStats } from './perfStore';
import { worldClock } from './worldClockRuntime';

function horaDelDia(tod: number): string {
  const min = Math.floor((((tod % 1) + 1) % 1) * 1440);
  const hh = Math.floor(min / 60) % 24;
  const mm = min % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

/**
 * PerfHUD — overlay de métricas (S0.2-H2). HTML fuera del Canvas.
 *
 * Se suscribe a perfStore (≈5 Hz). Toggle con la tecla `\`` (backtick). Colorea
 * según los presupuestos de Fase 0 (ver docs/08-estrategia-rendimiento.md):
 * 60 fps objetivo, draw calls ≤ 150.
 */

const CHAMPAN = '#cbb89a';
const AMBER = '#e0a955';
const RED = '#e06a5a';
const DIM = '#8c7b66';

function fpsColor(fps: number): string {
  if (fps > 0 && fps < 50) return RED;
  if (fps > 0 && fps < 58) return AMBER;
  return CHAMPAN;
}

function drawCallColor(dc: number): string {
  if (dc > 150) return RED;
  if (dc > 120) return AMBER;
  return CHAMPAN;
}

function Row({ label, value, color = CHAMPAN }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 18 }}>
      <span style={{ color: DIM }}>{label}</span>
      <span style={{ color, fontVariantNumeric: 'tabular-nums' }}>{value}</span>
    </div>
  );
}

export default function PerfHUD() {
  const s: PerfStats = useSyncExternalStore(subscribePerf, getPerf, getPerf);
  const [visible, setVisible] = useState(true);
  const [mounted, setMounted] = useState(false); // evita mismatch de hidratación con la hora (Date.now)

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === '`') setVisible((v) => !v);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (!visible) return null;

  return (
    <div
      style={{
        position: 'absolute',
        top: 20,
        right: 20,
        minWidth: 190,
        padding: '12px 14px',
        background: 'rgba(13,13,13,0.66)',
        backdropFilter: 'blur(6px)',
        border: '1px solid rgba(203,184,154,0.18)',
        borderRadius: 10,
        color: CHAMPAN,
        font: "11px/1.7 ui-monospace, 'SF Mono', Menlo, monospace",
        letterSpacing: '0.04em',
        pointerEvents: 'none',
        userSelect: 'none',
      }}
    >
      <div
        style={{
          color: DIM,
          textTransform: 'uppercase',
          letterSpacing: '0.22em',
          fontSize: 9,
          marginBottom: 8,
        }}
      >
        OSIA · perf · {s.backend}
      </div>
      <Row label="hora" value={mounted ? horaDelDia(worldClock.tod) : '—:—'} />
      <Row label="fps" value={s.fps.toFixed(0)} color={fpsColor(s.fps)} />
      <Row label="draw calls" value={String(s.drawCalls)} color={drawCallColor(s.drawCalls)} />
      <Row label="triángulos" value={s.triangles.toLocaleString('es-CO')} />
      <Row label="geometrías" value={String(s.geometries)} />
      <Row label="texturas" value={String(s.textures)} />
      <Row label="render scale" value={`${s.pixelRatio.toFixed(2)}×`} />
      <div style={{ color: DIM, fontSize: 9, marginTop: 8, letterSpacing: '0.08em' }}>
        ` para ocultar
      </div>
    </div>
  );
}
