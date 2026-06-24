import type { CSSProperties } from 'react';

export type NameplateProps = {
  name: string;
  /** Acento del residente (hex); señal de identidad sobre su avatar. */
  accentColor: string;
};

/**
 * Nameplate (HUD diegético, docs/02 §8.2) — el nombre del residente sobre su avatar, con su acento
 * como marca de identidad. Tonto: recibe nombre + acento ya resueltos (lo posiciona el world-client
 * vía drei <Html>). Píldora ónix translúcida + texto marfil legible sobre cualquier fondo.
 */
export function Nameplate({ name, accentColor }: NameplateProps) {
  return (
    <span className="osia-nameplate" style={{ borderColor: accentColor } as CSSProperties}>
      <span className="osia-nameplate__dot" aria-hidden style={{ background: accentColor }} />
      {name}
    </span>
  );
}
