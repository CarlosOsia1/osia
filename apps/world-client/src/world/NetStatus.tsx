'use client';

import { useNetState } from '../net/useNet';

/**
 * NetStatus — overlay HTML (fuera del Canvas) con el estado de presencia:
 * conexión + número de viajeros. Estética OSIA (ónix/champán).
 */

const CHAMPAN = '#cbb89a';
const AMBER = '#e0a955';
const DIM = '#8c7b66';

export default function NetStatus() {
  const { status, count } = useNetState();

  let label: string;
  let dot: string;
  switch (status) {
    case 'connected':
      label = `${count} ${count === 1 ? 'viajero' : 'viajeros'} en el claro`;
      dot = CHAMPAN;
      break;
    case 'connecting':
      label = 'conectando…';
      dot = AMBER;
      break;
    case 'reconnecting':
      label = 'reconectando…';
      dot = AMBER;
      break;
    default:
      label = 'sin conexión';
      dot = DIM;
      break;
  }

  return (
    <div
      style={{
        position: 'absolute',
        top: 52,
        left: 28,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        color: DIM,
        font: "11px/1 ui-monospace, 'SF Mono', Menlo, monospace",
        letterSpacing: '0.12em',
        textTransform: 'lowercase',
        pointerEvents: 'none',
        userSelect: 'none',
      }}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: '50%',
          background: dot,
          boxShadow: `0 0 8px ${dot}`,
        }}
      />
      {label}
    </div>
  );
}
