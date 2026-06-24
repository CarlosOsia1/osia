/**
 * Carga de variables de entorno — DEBE ser el primer import de main.ts. En ESM los imports se
 * hoistean, así que este side-effect (dotenv) corre antes que cualquier otro módulo lea process.env.
 *
 * En dev, los secretos viven en `supabase/.env.local` (gitignored, compartido con el CLI). apps/api
 * también acepta su propio `apps/api/.env`. En prod, las vars vienen del entorno (Doppler/host).
 */
import { config as loadDotenv } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url)); // apps/api/src
loadDotenv({ path: resolve(here, '../.env') }); // apps/api/.env (opcional)
loadDotenv({ path: resolve(here, '../../../supabase/.env.local') }); // secretos compartidos
