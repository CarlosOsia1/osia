import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';
import { getMessages, defaultLocale, isLocale } from '@osia/i18n';

/**
 * Resolución de locale SIN routing en la URL (es un mundo inmersivo de una sola ruta):
 * el idioma vive en una cookie `osia.locale` que pone el selector; default es-CO.
 */
export default getRequestConfig(async () => {
  const cookieLocale = (await cookies()).get('osia.locale')?.value;
  const locale = isLocale(cookieLocale) ? cookieLocale : defaultLocale;
  return { locale, messages: getMessages(locale) };
});
