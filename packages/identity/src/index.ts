/**
 * @osia/identity — Cliente SSO compartido (pasaporte que viaja entre apps). Único acoplamiento
 * entre apps del ecosistema (sin kernel de launcher). Ver CLAUDE.md §14, backlog S1.3-H4.
 */
export {
  OsiaIdentityClient,
  OsiaApiError,
  type OsiaIdentityClientOptions,
} from './OsiaIdentityClient';
export { useOsiaSession, usePassport, OSIA_SESSION_KEY } from './useOsiaSession';
export { buildDeepLink, resolvePostLoginUrl } from './deepLink';
