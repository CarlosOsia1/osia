import { Inject, Injectable } from '@nestjs/common';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_ADMIN } from './supabase.tokens';
import type { SupabaseAuthPort } from '../../application/ports/out/supabase-auth.port';

/**
 * Adapter de Supabase Auth (infrastructure): traduce el port a llamadas del SDK con service_role.
 * El SDK NUNCA aparece fuera de esta capa (hexagonal). En S1.3 sumará signUp/verify/sessions.
 */
@Injectable()
export class SupabaseAuthAdapter implements SupabaseAuthPort {
  constructor(@Inject(SUPABASE_ADMIN) private readonly admin: SupabaseClient) {}

  async ping(): Promise<{ ok: boolean; users: number }> {
    // listUsers requiere service_role: valida credenciales + conectividad con GoTrue.
    const { data, error } = await this.admin.auth.admin.listUsers({ page: 1, perPage: 1 });
    if (error) throw error;
    return { ok: true, users: data.users.length };
  }
}
