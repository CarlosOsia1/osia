import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';
import { LOCALE_COOKIE, requestConfigFor } from '@osia/i18n';

/**
 * Resolución de locale por cookie `osia.locale` (mismo patrón en todas las apps del ecosistema).
 * La resolución vive una sola vez en @osia/i18n (requestConfigFor); acá solo el read de la cookie.
 */
export default getRequestConfig(async () => {
  const value = (await cookies()).get(LOCALE_COOKIE)?.value;
  return requestConfigFor(value);
});
