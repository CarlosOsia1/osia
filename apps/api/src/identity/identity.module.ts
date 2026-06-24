import { Module } from '@nestjs/common';
import { AuthController } from './web/auth.controller';
import { WaitlistController } from './web/waitlist.controller';
import { JoinWaitlistUseCase } from './application/use-cases/join-waitlist.use-case';
import { WAITLIST_REPOSITORY } from './application/ports/out/waitlist.repository';
import { PgWaitlistRepository } from './infrastructure/postgres/waitlist.repository';

/**
 * Bounded context `identity` (NestJS hexagonal): web (controllers) → application (use cases +
 * ports) → infrastructure (adapters pg/Supabase). Los ports se inyectan por token; los adapters
 * concretos solo se cablean aquí. Auth (login/session) llega en S1.3-H3.
 */
@Module({
  controllers: [AuthController, WaitlistController],
  providers: [
    JoinWaitlistUseCase,
    { provide: WAITLIST_REPOSITORY, useClass: PgWaitlistRepository },
  ],
})
export class IdentityModule {}
