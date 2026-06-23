'use client';

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

/**
 * ThemeProvider (S1.1-H3) — provee las PREFERENCIAS de experiencia a toda la app.
 *
 * Las CSS vars (tokens) las inyecta `@osia/ui/styles.css` (importado una vez en el layout);
 * este provider expone al árbol React lo que el CSS solo no puede: la preferencia de
 * `prefers-reduced-motion` legible en JS (para degradar animaciones de useFrame/rAF del
 * mundo 3D, no solo en CSS) y la preferencia de sonido (opt-in; el engine de sonido llega
 * después). Respeta el SO y reacciona a cambios en vivo. Ver CLAUDE.md §9.
 */
export type ThemePrefs = {
  /** El SO/usuario pidió menos movimiento: el mundo degrada loops y transforma a fade. */
  reducedMotion: boolean;
  /** Sonido ambiente/SFX habilitado (opt-in; silencio hasta el primer gesto). */
  soundEnabled: boolean;
  setSoundEnabled: (on: boolean) => void;
};

const ThemeContext = createContext<ThemePrefs | null>(null);

export function ThemeProvider({
  children,
  defaultSound = false,
}: {
  children: ReactNode;
  defaultSound?: boolean;
}) {
  const [systemReduced, setSystemReduced] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(defaultSound);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setSystemReduced(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  const value = useMemo<ThemePrefs>(
    () => ({ reducedMotion: systemReduced, soundEnabled, setSoundEnabled }),
    [systemReduced, soundEnabled],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemePrefs {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme() debe usarse dentro de <ThemeProvider>');
  return ctx;
}

/** Atajo: ¿degradar la animación? (preferencia de reduce-motion del SO/usuario). */
export function useReducedMotion(): boolean {
  return useTheme().reducedMotion;
}
