'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Panel, Text } from '@osia/ui';
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
 * Superficie y color vienen de @osia/ui (Panel + tokens); texto vía i18n (@osia/i18n).
 * Se suscribe a perfStore (≈5 Hz). Toggle con la tecla `\`` (backtick). Colorea
 * según los presupuestos de Fase 0 (docs/08): 60 fps objetivo, draw calls ≤ 150.
 */

// Color por presupuesto: tokens semánticos de @osia/ui, no hex crudos.
const C_OK = 'var(--color-accent)';
const C_WARN = 'var(--color-warning)';
const C_BAD = 'var(--color-danger)';

function fpsColor(fps: number): string {
  if (fps > 0 && fps < 50) return C_BAD;
  if (fps > 0 && fps < 58) return C_WARN;
  return C_OK;
}

function drawCallColor(dc: number): string {
  if (dc > 150) return C_BAD;
  if (dc > 120) return C_WARN;
  return C_OK;
}

function Row({ label, value, color = C_OK }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-5)' }}>
      <Text variant="label" tone="subtle">
        {label}
      </Text>
      <Text variant="value" style={{ color }}>
        {value}
      </Text>
    </div>
  );
}

export default function PerfHUD() {
  const s: PerfStats = useSyncExternalStore(subscribePerf, getPerf, getPerf);
  const t = useTranslations('hud');
  const locale = useLocale();
  const [visible, setVisible] = useState(true);
  const [mounted, setMounted] = useState(false); // evita mismatch de hidratación con la hora

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
    <Panel
      style={{
        position: 'absolute',
        top: 'var(--space-5)',
        right: 'var(--space-5)',
        minWidth: 190,
        padding: '12px 14px',
        display: 'grid',
        gap: 'var(--space-1)',
        font: 'var(--text-sm)/var(--leading-loose) var(--font-ui)',
        pointerEvents: 'none',
        userSelect: 'none',
      }}
    >
      <Text variant="overline" tone="subtle" style={{ marginBottom: 6 }}>
        {t('perfTitle')} · {s.backend}
      </Text>
      <Row label={t('time')} value={mounted ? horaDelDia(worldClock.tod) : '—:—'} />
      <Row label={t('fps')} value={s.fps.toFixed(0)} color={fpsColor(s.fps)} />
      <Row label={t('drawCalls')} value={String(s.drawCalls)} color={drawCallColor(s.drawCalls)} />
      <Row label={t('triangles')} value={s.triangles.toLocaleString(locale)} />
      <Row label={t('geometries')} value={String(s.geometries)} />
      <Row label={t('textures')} value={String(s.textures)} />
      <Row label={t('renderScale')} value={`${s.pixelRatio.toFixed(2)}×`} />
      <Text variant="overline" tone="subtle" style={{ marginTop: 6 }}>
        {t('hideHint')}
      </Text>
    </Panel>
  );
}
