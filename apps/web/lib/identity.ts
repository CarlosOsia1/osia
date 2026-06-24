import { OsiaIdentityClient } from '@osia/identity';

/** Cliente SSO de OSIA para apps/web. apiBaseUrl desde NEXT_PUBLIC_API_URL (default dev). */
export const identity = new OsiaIdentityClient({
  apiBaseUrl: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000',
});
