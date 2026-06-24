import { Inject, Injectable } from '@nestjs/common';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_ADMIN } from './supabase.tokens';
import type {
  CreateUserInput,
  SupabaseAuthPort,
} from '../../application/ports/out/supabase-auth.port';

/**
 * Adapter de Supabase Auth (infrastructure): traduce el port a llamadas del SDK con service_role.
 * El SDK NUNCA aparece fuera de esta capa (hexagonal).
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

  async createUser(input: CreateUserInput): Promise<{ id: string }> {
    const { data, error } = await this.admin.auth.admin.createUser({
      email: input.email,
      password: input.password,
      email_confirm: false, // requiere verificación de email (S1.5)
      user_metadata: input.metadata ?? {},
    });
    if (error) throw error;
    if (!data.user) throw new Error('createUser no devolvió usuario');
    return { id: data.user.id };
  }

  async deleteUser(id: string): Promise<void> {
    const { error } = await this.admin.auth.admin.deleteUser(id);
    if (error) throw error;
  }
}
