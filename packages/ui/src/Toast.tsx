'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { IconX } from './icons';
import { Text } from './Text';

/**
 * Toast — confirmaciones y fallos efímeros (R1 de la reconstrucción: antes seguir/reaccionar
 * fallaban en silencio). Un solo `ToastProvider` por app; las pantallas usan `useToast()`.
 *
 * Semántica accesible: `error` anuncia con `role="alert"` (asertivo); `info`/`success` con
 * `role="status"` (cortés). Autocierre con pausa mientras el puntero está encima (el usuario
 * está leyendo); botón de cierre explícito siempre. La entrada/salida respeta
 * `prefers-reduced-motion` (vía styles.css). Máximo 4 visibles: al llegar el quinto, el más
 * antiguo se despide (FIFO) — nada de pilas infinitas.
 *
 * i18n (§2.3): el componente NO trae strings — la app pasa `regionLabel` (nombre accesible del
 * área de toasts) y `closeLabel` (botón de cierre) ya traducidos.
 */
export type ToastKind = 'info' | 'success' | 'error';

export type ToastOptions = {
  /** Milisegundos antes del autocierre (default: 4000; errores 6000). `0` = no se autocierra. */
  durationMs?: number;
};

type ToastApi = {
  show: (kind: ToastKind, message: string, options?: ToastOptions) => void;
  info: (message: string, options?: ToastOptions) => void;
  success: (message: string, options?: ToastOptions) => void;
  error: (message: string, options?: ToastOptions) => void;
};

type ToastEntry = {
  id: number;
  kind: ToastKind;
  message: string;
  durationMs: number;
};

const MAX_VISIBLE = 4;
const DEFAULT_DURATION_MS = 4000;
const ERROR_DURATION_MS = 6000;

const ToastContext = createContext<ToastApi | null>(null);

/** Acceso al toaster de la app. Debe existir un `<ToastProvider>` por encima. */
export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) throw new Error('useToast requiere un <ToastProvider> en el árbol');
  return api;
}

export type ToastProviderProps = {
  children: ReactNode;
  /** Nombre accesible del área de toasts (p.ej. «Avisos»), ya traducido. */
  regionLabel: string;
  /** Etiqueta del botón de cierre de cada toast (p.ej. «Cerrar»), ya traducida. */
  closeLabel: string;
};

export function ToastProvider({ children, regionLabel, closeLabel }: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);
  const nextId = useRef(1);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const show = useCallback((kind: ToastKind, message: string, options?: ToastOptions) => {
    const id = nextId.current++;
    const fallback = kind === 'error' ? ERROR_DURATION_MS : DEFAULT_DURATION_MS;
    const durationMs = options?.durationMs ?? fallback;
    setToasts((current) => [...current.slice(-(MAX_VISIBLE - 1)), { id, kind, message, durationMs }]);
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      show,
      info: (message, options) => show('info', message, options),
      success: (message, options) => show('success', message, options),
      error: (message, options) => show('error', message, options),
    }),
    [show],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      {mounted &&
        createPortal(
          <div className="osia-toaster" aria-label={regionLabel}>
            {toasts.map((t) => (
              <ToastCard key={t.id} toast={t} closeLabel={closeLabel} onDismiss={dismiss} />
            ))}
          </div>,
          document.body,
        )}
    </ToastContext.Provider>
  );
}

function ToastCard({
  toast,
  closeLabel,
  onDismiss,
}: {
  toast: ToastEntry;
  closeLabel: string;
  onDismiss: (id: number) => void;
}) {
  const { id, kind, message, durationMs } = toast;
  const remaining = useRef(durationMs);
  const startedAt = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pause = useCallback(() => {
    if (timer.current === null) return;
    clearTimeout(timer.current);
    timer.current = null;
    remaining.current -= Date.now() - startedAt.current;
  }, []);

  const resume = useCallback(() => {
    if (durationMs === 0 || timer.current !== null) return;
    startedAt.current = Date.now();
    timer.current = setTimeout(() => onDismiss(id), Math.max(remaining.current, 400));
  }, [durationMs, id, onDismiss]);

  useEffect(() => {
    resume();
    return pause;
  }, [pause, resume]);

  return (
    <div
      className="osia-toast"
      data-kind={kind}
      role={kind === 'error' ? 'alert' : 'status'}
      onMouseEnter={pause}
      onMouseLeave={resume}
    >
      <span className="osia-toast__dot" aria-hidden="true" />
      <Text variant="meta" className="osia-toast__message">
        {message}
      </Text>
      <button
        type="button"
        className="osia-toast__close"
        aria-label={closeLabel}
        onClick={() => onDismiss(id)}
      >
        <IconX />
      </button>
    </div>
  );
}
