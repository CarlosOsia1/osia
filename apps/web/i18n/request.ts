import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';
import { getMessages, defaultLocale, isLocale } from '@osia/i18n';

/**
 * Resolución de locale por cookie `osia.locale` (mismo patrón que world-client, para que el
 * idioma viaje consistente entre apps del ecosistema): default es-CO; segundo idioma en.
 * El routing por URL (SEO de landing) se evaluará en S1.4 si hace falta.
 */
export default getRequestConfig(async () => {
  const cookieLocale = (await cookies()).get('osia.locale')?.value;
  const locale = isLocale(cookieLocale) ? cookieLocale : defaultLocale;
  return { locale, messages: getMessages(locale) };
});
