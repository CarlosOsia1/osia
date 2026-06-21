/**
 * @osia/i18n — Catálogos de mensajes EN+ES compartidos por todas las apps del ecosistema.
 *
 * Fuente única de los textos de UI. Las apps (world-client, futura web/social/games)
 * los consumen vía next-intl. Default es-CO; segundo idioma en. Formato ICU (plurales,
 * fechas, números) lo resuelve next-intl. Ver CLAUDE.md §3 y docs/02 §3.
 */

import es from './messages/es.json';
import en from './messages/en.json';

export const locales = ['es', 'en'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'es';

/** Forma de los mensajes (el español es la referencia de claves; en debe tener paridad). */
export type Messages = typeof es;

const MESSAGES: Record<Locale, Messages> = { es, en };

export function isLocale(value: string | undefined | null): value is Locale {
  return value != null && (locales as readonly string[]).includes(value);
}

/** Mensajes de un locale (cae a `defaultLocale` si no es válido). */
export function getMessages(locale: string | undefined | null): Messages {
  return isLocale(locale) ? MESSAGES[locale] : MESSAGES[defaultLocale];
}
