'use client';

import { useState } from 'react';
import { Button, Card, Field, Modal, Panel } from '@osia/ui';

/**
 * /styleguide — página interna de dev (S1.1-H3 DoD): muestra tokens + las primitivas del
 * design system en dark-first. NO es UI de producto (por eso queda fuera de la regla de i18n,
 * eslint.config.mjs): es una herramienta de desarrollo. Las primitivas SÍ consumen tokens.
 *
 * Nota: en Next App Router las carpetas con prefijo `_` son privadas (sin ruta), por eso la
 * ruta es `/styleguide` y no `/__styleguide` como decía el backlog.
 */

const SWATCHES: { label: string; token: string; onAccent?: boolean }[] = [
  { label: 'bg', token: '--color-bg' },
  { label: 'surface', token: '--color-surface' },
  { label: 'surface-2', token: '--color-surface-2' },
  { label: 'accent', token: '--color-accent', onAccent: true },
  { label: 'text', token: '--color-text' },
  { label: 'text-muted', token: '--color-text-muted' },
  { label: 'border', token: '--color-border' },
  { label: 'success', token: '--color-success' },
  { label: 'warning', token: '--color-warning' },
  { label: 'danger', token: '--color-danger' },
];

const section: React.CSSProperties = { display: 'grid', gap: 'var(--space-4)', marginBottom: 'var(--space-8)' };

export default function StyleguidePage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [value, setValue] = useState('');

  return (
    <main style={{ maxWidth: '60rem', margin: '0 auto', padding: 'var(--space-7) var(--space-5)' }}>
      <header style={{ marginBottom: 'var(--space-8)' }}>
        <span className="osia-overline">Design System · OSIA</span>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', margin: 'var(--space-2) 0 0' }}>
          Tokens y primitivas
        </h1>
        <p style={{ color: 'var(--color-text-muted)', margin: 'var(--space-2) 0 0' }}>
          Dark-first. Italiana para marca, Jost para todo lo demás.
        </p>
      </header>

      {/* ---- Color ---- */}
      <section style={section}>
        <span className="osia-overline">Color</span>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(8rem, 1fr))', gap: 'var(--space-3)' }}>
          {SWATCHES.map((s) => (
            <div key={s.token} className="osia-card" style={{ overflow: 'hidden' }}>
              <div
                style={{
                  background: `var(${s.token})`,
                  height: 'var(--space-9)',
                  display: 'grid',
                  placeItems: 'center',
                  color: s.onAccent ? 'var(--color-on-accent)' : 'var(--color-text)',
                  fontSize: 'var(--text-sm)',
                }}
              >
                {s.label}
              </div>
              <code style={{ display: 'block', padding: 'var(--space-2)', fontSize: 'var(--text-xs)', color: 'var(--color-text-subtle)', fontFamily: 'var(--font-ui)' }}>
                {s.token}
              </code>
            </div>
          ))}
        </div>
      </section>

      {/* ---- Tipografía ---- */}
      <section style={section}>
        <span className="osia-overline">Tipografía</span>
        <p style={{ fontFamily: 'var(--font-display)', fontSize: '3rem', margin: 0, color: 'var(--color-text-strong)' }}>
          El Mundo
        </p>
        <p style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-xl)', margin: 0 }}>
          Jost · la voz por defecto del producto (UI, HUD, software).
        </p>
        <p style={{ fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums', margin: 0, color: 'var(--color-text-muted)' }}>
          Números tabulares: 0123456789 · 60 fps · 1 250 ms
        </p>
      </section>

      {/* ---- Botones ---- */}
      <section style={section}>
        <span className="osia-overline">Botones</span>
        <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', alignItems: 'center' }}>
          <Button variant="primary">Acción</Button>
          <Button variant="secondary">Secundario</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Peligro</Button>
          <Button variant="primary" loading>
            Cargando
          </Button>
          <Button variant="secondary" disabled>
            Deshabilitado
          </Button>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', alignItems: 'center' }}>
          <Button size="sm">sm</Button>
          <Button size="md">md</Button>
          <Button size="lg">lg</Button>
        </div>
      </section>

      {/* ---- Card / Panel ---- */}
      <section style={section}>
        <span className="osia-overline">Superficies</span>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(14rem, 1fr))', gap: 'var(--space-4)' }}>
          <Card pad>
            <strong>Card</strong>
            <p style={{ color: 'var(--color-text-muted)', margin: 'var(--space-2) 0 0' }}>
              Superficie de contenido, opaca, pensada para leer.
            </p>
          </Card>
          <Card pad interactive>
            <strong>Card interactiva</strong>
            <p style={{ color: 'var(--color-text-muted)', margin: 'var(--space-2) 0 0' }}>
              Hover de borde y elevación.
            </p>
          </Card>
          <Panel style={{ padding: 'var(--space-4)' }}>
            <strong>Panel</strong>
            <p style={{ color: 'var(--color-text-muted)', margin: 'var(--space-2) 0 0' }}>
              Superficie HUD translúcida.
            </p>
          </Panel>
        </div>
      </section>

      {/* ---- Field ---- */}
      <section style={section}>
        <span className="osia-overline">Campo</span>
        <div style={{ display: 'grid', gap: 'var(--space-3)', maxWidth: '20rem' }}>
          <Field
            placeholder="tu handle"
            value={value}
            onChange={(e) => setValue(e.currentTarget.value)}
          />
          <Field placeholder="con error" invalid />
        </div>
      </section>

      {/* ---- Modal ---- */}
      <section style={section}>
        <span className="osia-overline">Modal</span>
        <div>
          <Button variant="primary" onClick={() => setModalOpen(true)}>
            Abrir modal
          </Button>
        </div>
        <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Un momento ceremonial">
          <p style={{ color: 'var(--color-text-muted)', marginTop: 0 }}>
            Atrapa el foco, cierra con Esc o clic afuera, y devuelve el foco al cerrar.
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)', marginTop: 'var(--space-4)' }}>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Cerrar
            </Button>
          </div>
        </Modal>
      </section>
    </main>
  );
}
