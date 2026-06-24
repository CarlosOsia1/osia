import { Module } from '@nestjs/common';
import { AuthController } from './web/auth.controller';

/**
 * Bounded context `identity` (NestJS hexagonal). En S1.3 sumará domain/application/infrastructure:
 * ports `in` (casos de uso) y `out` (AccountRepository, SupabaseAuthPort), con adapters de
 * Supabase/Redis SOLO en infrastructure. Por ahora solo el controlador de auth (stub).
 */
@Module({
  controllers: [AuthController],
})
export class IdentityModule {}
