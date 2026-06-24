'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

/**
 * ThemeProvider (S1.1-H3 / S1.6-H3) — provee las PREFERENCIAS de experiencia a toda la app.
 *
 * Las CSS vars (tokens) las inyecta `@osia/ui/styles.css` (importado una vez en el layout);
 * este provider expone al árbol React lo que el CSS solo no puede: la preferencia de movimiento
 * reducido legible en JS (para degradar loops de useFrame/rAF del mundo 3D, no solo en CSS) y la
 * de sonido. Respeta el SO y permite un override del residente, persistido en localStorage como
 * cache de cliente (el servidor es la verdad durable: `profiles.prefs`). Ver CLAUDE.md §9.
 */
export type ReducedMotionPref = 'system' | 'reduce' | 'allow';

export type ThemePrefs = {
  /** Resuelto: ¿degradar animación? (override del residente, o el SO si es 'system'). */
  reducedMotion: boolean;
  reducedMotionPref: ReducedMotionPref;
  setReducedMotionPref: (pref: ReducedMotionPref) => void;
  /** Sonido ambiente/SFX habilitado (opt-in; silencio hasta el primer gesto). */
  soundEnabled: boolean;
  setSoundEnabled: (on: boolean) => void;
};

const ThemeContext = createContext<ThemePrefs | null>(null);
const PREFS_STORAGE_KEY = 'osia.prefs';

type StoredPrefs = { sound?: boolean; reducedMotion?: ReducedMotionPref };

function readStoredPrefs(): StoredPrefs {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(PREFS_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredPrefs) : {};
  } catch {
    return {}; // almacenamiento no disponible (modo privado / SSR)
  }
}

function writeStoredPrefs(prefs: StoredPrefs): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    /* almacenamiento no disponible: la verdad vive en el servidor */
  }
}

export function ThemeProvider({
  children,
  defaultSound = false,
}: {
  children: ReactNode;
  defaultSound?: boolean;
}) {
  const [systemReduced, setSystemReduced] = useState(false);
  const [reducedMotionPref, setPrefState] = useState<ReducedMotionPref>('system');
  const [soundEnabled, setSoundState] = useState(defaultSound);

  // Hidrata desde localStorage en cliente (los defaults SSR-safe evitan mismatch de hidratación).
  useEffect(() => {
    const stored = readStoredPrefs();
    if (stored.reducedMotion) setPrefState(stored.reducedMotion);
    if (typeof stored.sound === 'boolean') setSoundState(stored.sound);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = (): void => setSystemReduced(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  const setReducedMotionPref = useCallback(
    (pref: ReducedMotionPref): void => {
      setPrefState(pref);
      writeStoredPrefs({ sound: soundEnabled, reducedMotion: pref });
    },
    [soundEnabled],
  );

  const setSoundEnabled = useCallback(
    (on: boolean): void => {
      setSoundState(on);
      writeStoredPrefs({ sound: on, reducedMotion: reducedMotionPref });
    },
    [reducedMotionPref],
  );

  const reducedMotion =
    reducedMotionPref === 'reduce' ? true : reducedMotionPref === 'allow' ? false : systemReduced;

  const value = useMemo<ThemePrefs>(
    () => ({
      reducedMotion,
      reducedMotionPref,
      setReducedMotionPref,
      soundEnabled,
      setSoundEnabled,
    }),
    [reducedMotion, reducedMotionPref, setReducedMotionPref, soundEnabled, setSoundEnabled],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemePrefs {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme() debe usarse dentro de <ThemeProvider>');
  return ctx;
}

/** Atajo: ¿degradar la animación? (override del residente o preferencia del SO). */
export function useReducedMotion(): boolean {
  return useTheme().reducedMotion;
}
