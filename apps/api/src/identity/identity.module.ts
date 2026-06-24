import { Module } from '@nestjs/common';
import { AuthController } from './web/auth.controller';
import { WaitlistController } from './web/waitlist.controller';
import { WorldController } from './web/world.controller';
import { ProfileController } from './web/profile.controller';
import { ProfileService } from './application/profile.service';
import { PROFILE_REPOSITORY } from './application/ports/out/profile.repository';
import { PgProfileRepository } from './infrastructure/postgres/profile.repository';
import { JoinWaitlistUseCase } from './application/use-cases/join-waitlist.use-case';
import { SignupUseCase } from './application/use-cases/signup.use-case';
import { LoginUseCase } from './application/use-cases/login.use-case';
import { RefreshSessionUseCase } from './application/use-cases/refresh-session.use-case';
import { LogoutUseCase } from './application/use-cases/logout.use-case';
import { VerifyEmailUseCase } from './application/use-cases/verify-email.use-case';
import { ResendVerificationUseCase } from './application/use-cases/resend-verification.use-case';
import { IssueWorldTicketUseCase } from './application/use-cases/issue-world-ticket.use-case';
import { WAITLIST_REPOSITORY } from './application/ports/out/waitlist.repository';
import { INVITATION_REPOSITORY } from './application/ports/out/invitation.repository';
import { ACCOUNT_REPOSITORY } from './application/ports/out/account.repository';
import { WORLD_TICKET_PORT } from './application/ports/out/world-ticket.port';
import { PgWaitlistRepository } from './infrastructure/postgres/waitlist.repository';
import { PgInvitationRepository } from './infrastructure/postgres/invitation.repository';
import { PgAccountRepository } from './infrastructure/postgres/account.repository';
import { JoseWorldTicketAdapter } from './infrastructure/jose/world-ticket.adapter';
import { AuthGuard } from '../common/auth.guard';

/**
 * Bounded context `identity` (NestJS hexagonal): web (controllers) → application (use cases +
 * ports) → infrastructure (adapters pg/Supabase/jose). Los ports se inyectan por token; los
 * adapters concretos solo se cablean aquí.
 */
@Module({
  controllers: [AuthController, WaitlistController, WorldController, ProfileController],
  providers: [
    ProfileService,
    JoinWaitlistUseCase,
    SignupUseCase,
    LoginUseCase,
    RefreshSessionUseCase,
    LogoutUseCase,
    VerifyEmailUseCase,
    ResendVerificationUseCase,
    IssueWorldTicketUseCase,
    AuthGuard,
    { provide: WAITLIST_REPOSITORY, useClass: PgWaitlistRepository },
    { provide: INVITATION_REPOSITORY, useClass: PgInvitationRepository },
    { provide: ACCOUNT_REPOSITORY, useClass: PgAccountRepository },
    { provide: WORLD_TICKET_PORT, useClass: JoseWorldTicketAdapter },
    { provide: PROFILE_REPOSITORY, useClass: PgProfileRepository },
  ],
})
export class IdentityModule {}
