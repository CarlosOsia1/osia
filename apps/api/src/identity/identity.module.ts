import { Module } from '@nestjs/common';
import { AuthController } from './web/auth.controller';
import { WaitlistController } from './web/waitlist.controller';
import { JoinWaitlistUseCase } from './application/use-cases/join-waitlist.use-case';
import { SignupUseCase } from './application/use-cases/signup.use-case';
import { WAITLIST_REPOSITORY } from './application/ports/out/waitlist.repository';
import { INVITATION_REPOSITORY } from './application/ports/out/invitation.repository';
import { ACCOUNT_REPOSITORY } from './application/ports/out/account.repository';
import { PgWaitlistRepository } from './infrastructure/postgres/waitlist.repository';
import { PgInvitationRepository } from './infrastructure/postgres/invitation.repository';
import { PgAccountRepository } from './infrastructure/postgres/account.repository';

/**
 * Bounded context `identity` (NestJS hexagonal): web (controllers) → application (use cases +
 * ports) → infrastructure (adapters pg/Supabase). Los ports se inyectan por token; los adapters
 * concretos solo se cablean aquí. login/session reales llegan en S1.3-H3.
 */
@Module({
  controllers: [AuthController, WaitlistController],
  providers: [
    JoinWaitlistUseCase,
    SignupUseCase,
    { provide: WAITLIST_REPOSITORY, useClass: PgWaitlistRepository },
    { provide: INVITATION_REPOSITORY, useClass: PgInvitationRepository },
    { provide: ACCOUNT_REPOSITORY, useClass: PgAccountRepository },
  ],
})
export class IdentityModule {}
