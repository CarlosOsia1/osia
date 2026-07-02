'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { ToastProvider } from '@osia/ui';
import { OsiaApiError } from '@osia/identity';
import { ApiContractError } from '../lib/api';

/**
 * Reintentos con criterio (R1): un tropiezo de red o un 5xx se reintenta hasta 2 veces (backoff
 * exponencial de TanStack); un 4xx es definitivo (repetirlo da lo mismo) y un `ApiContractError`
 * es un bug, no un estado de red — reintentar solo escondería la evidencia.
 */
function shouldRetry(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiContractError) return false;
  if (error instanceof OsiaApiError && error.status < 500) return false;
  return failureCount < 2;
}

/** Providers de cliente: TanStack Query (sesión SSO, datos del feed) + toaster global. */
export function Providers({ children }: { children: ReactNode }) {
  const t = useTranslations('social');
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: shouldRetry,
            // Listas frescas 15 s: navegar entre pantallas no dispara refetch en cascada.
            staleTime: 15_000,
          },
          mutations: { retry: false },
        },
      }),
  );
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider regionLabel={t('toasts.region')} closeLabel={t('toasts.close')}>
        {children}
      </ToastProvider>
    </QueryClientProvider>
  );
}
