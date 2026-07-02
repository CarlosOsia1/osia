import { Global, Module } from '@nestjs/common';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { WebSocket } from 'ws';
import { APP_ENV } from '../../../config/config.module';
import type { Env } from '../../../config/env';
import { SUPABASE_ADMIN, SUPABASE_ANON, SUPABASE_ANON_FACTORY } from './supabase.tokens';
import { SUPABASE_AUTH_PORT } from '../../application/ports/out/supabase-auth.port';
import { AUTH_SESSION_PORT } from '../../application/ports/out/auth-session.port';
import { SupabaseAuthAdapter } from './supabase-auth.adapter';
import { SupabaseSessionAdapter } from './supabase-session.adapter';

// El constructor de `ws` no es estructuralmente idéntico al WebSocketLikeConstructor del SDK;
// derivamos el tipo esperado y casamos (no es `any`).
type RealtimeTransport = NonNullable<
  NonNullable<Parameters<typeof createClient>[2]>['realtime']
>['transport'];

/**
 * Cablea el cliente Supabase (service_role) y los adapters de infrastructure. `@Global` para que
 * el port esté disponible en toda la app sin re-importar. La service_role key vive solo aquí
 * (server-side), nunca en bundles de cliente (docs/09).
 */
@Global()
@Module({
  providers: [
    {
      provide: SUPABASE_ADMIN,
      inject: [APP_ENV],
      useFactory: (env: Env): SupabaseClient =>
        createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
          auth: { persistSession: false, autoRefreshToken: false },
          // Node 20 no trae WebSocket nativo; realtime-js lo exige aunque no usemos realtime.
          realtime: { transport: WebSocket as unknown as RealtimeTransport },
        }),
    },
    {
      provide: SUPABASE_ANON,
      inject: [APP_ENV],
      useFactory: (env: Env): SupabaseClient => makeAnonClient(env),
    },
    {
      // Fábrica de clientes anon efímeros (uno por operación stateful; ver signOut).
      provide: SUPABASE_ANON_FACTORY,
      inject: [APP_ENV],
      useFactory: (env: Env) => (): SupabaseClient => makeAnonClient(env),
    },
    { provide: SUPABASE_AUTH_PORT, useClass: SupabaseAuthAdapter },
    { provide: AUTH_SESSION_PORT, useClass: SupabaseSessionAdapter },
  ],
  exports: [SUPABASE_ADMIN, SUPABASE_ANON, SUPABASE_ANON_FACTORY, SUPABASE_AUTH_PORT, AUTH_SESSION_PORT],
})
export class SupabaseModule {}

/** Crea un cliente anon (compartido o efímero) con las mismas opciones. */
function makeAnonClient(env: Env): SupabaseClient {
  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    // Node 20 no trae WebSocket nativo; realtime-js lo exige aunque no usemos realtime.
    realtime: { transport: WebSocket as unknown as RealtimeTransport },
  });
}
