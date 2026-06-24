import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';
import { LOCALE_COOKIE, requestConfigFor } from '@osia/i18n';

/**
 * Resolución de locale SIN routing en la URL: el idioma vive en la cookie `osia.locale`. La
 * resolución vive una sola vez en @osia/i18n (requestConfigFor); acá solo el read de la cookie.
 */
export default getRequestConfig(async () => {
  const value = (await cookies()).get(LOCALE_COOKIE)?.value;
  return requestConfigFor(value);
});
