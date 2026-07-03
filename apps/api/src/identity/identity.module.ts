import { Module } from '@nestjs/common';
import { AuthController } from './web/auth.controller';
import { WaitlistController } from './web/waitlist.controller';
import { WorldController } from './web/world.controller';
import { AccountController } from './web/account.controller';
import { ProfileController } from './web/profile.controller';
import { ProfileService } from './application/profile.service';
import { PROFILE_REPOSITORY } from './application/ports/out/profile.repository';
import { PgProfileRepository } from './infrastructure/postgres/profile.repository';
import { AvatarController } from './web/avatar.controller';
import { AvatarService } from './application/avatar.service';
import { AVATAR_REPOSITORY } from './application/ports/out/avatar.repository';
import { PgAvatarRepository } from './infrastructure/postgres/avatar.repository';
import { JoinWaitlistUseCase } from './application/use-cases/join-waitlist.use-case';
import { SignupUseCase } from './application/use-cases/signup.use-case';
import { LoginUseCase } from './application/use-cases/login.use-case';
import { ServerSessionService } from './application/server-session.service';
import { SESSION_STORE } from './application/ports/out/session-store.port';
import { PgSessionStore } from './infrastructure/postgres/pg-session-store';
import { VerifyEmailUseCase } from './application/use-cases/verify-email.use-case';
import { ResendVerificationUseCase } from './application/use-cases/resend-verification.use-case';
import { RequestPasswordResetUseCase } from './application/use-cases/request-password-reset.use-case';
import { ResetPasswordUseCase } from './application/use-cases/reset-password.use-case';
import { IssueWorldTicketUseCase } from './application/use-cases/issue-world-ticket.use-case';
import { DeleteAccountUseCase } from './application/use-cases/delete-account.use-case';
import { RequestAccountDeletionUseCase } from './application/use-cases/request-account-deletion.use-case';
import { ConfirmAccountDeletionUseCase } from './application/use-cases/confirm-account-deletion.use-case';
import { AccountErasureService } from './application/account-erasure.service';
import { RetentionService } from './application/retention.service';
import { RetentionCron } from './infrastructure/schedule/retention.cron';
import { WAITLIST_REPOSITORY } from './application/ports/out/waitlist.repository';
import { INVITATION_REPOSITORY } from './application/ports/out/invitation.repository';
import { ACCOUNT_REPOSITORY } from './application/ports/out/account.repository';
import { AUDIT_LOG_REPOSITORY } from './application/ports/out/audit-log.repository';
import { RETENTION_REPOSITORY } from './application/ports/out/retention.repository';
import { DELETION_TOKEN_REPOSITORY } from './application/ports/out/deletion-token.repository';
import { EMAIL_PORT } from './application/ports/out/email.port';
import { WORLD_TICKET_PORT } from './application/ports/out/world-ticket.port';
import { PgWaitlistRepository } from './infrastructure/postgres/waitlist.repository';
import { PgInvitationRepository } from './infrastructure/postgres/invitation.repository';
import { PgAccountRepository } from './infrastructure/postgres/account.repository';
import { PgAuditLogRepository } from './infrastructure/postgres/audit-log.repository';
import { PgRetentionRepository } from './infrastructure/postgres/retention.repository';
import { PgDeletionTokenRepository } from './infrastructure/postgres/deletion-token.repository';
import { SmtpEmailAdapter } from './infrastructure/email/smtp-email.adapter';
import { JoseWorldTicketAdapter } from './infrastructure/jose/world-ticket.adapter';
import { AuthGuard } from '../common/auth.guard';

/**
 * Bounded context `identity` (NestJS hexagonal): web (controllers) → application (use cases +
 * ports) → infrastructure (adapters pg/Supabase/jose). Los ports se inyectan por token; los
 * adapters concretos solo se cablean aquí.
 */
@Module({
  controllers: [
    AuthController,
    WaitlistController,
    WorldController,
    AccountController,
    ProfileController,
    AvatarController,
  ],
  providers: [
    ProfileService,
    AvatarService,
    JoinWaitlistUseCase,
    SignupUseCase,
    LoginUseCase,
    ServerSessionService,
    VerifyEmailUseCase,
    ResendVerificationUseCase,
    RequestPasswordResetUseCase,
    ResetPasswordUseCase,
    IssueWorldTicketUseCase,
    DeleteAccountUseCase,
    RequestAccountDeletionUseCase,
    ConfirmAccountDeletionUseCase,
    AccountErasureService,
    RetentionService,
    RetentionCron,
    AuthGuard,
    { provide: WAITLIST_REPOSITORY, useClass: PgWaitlistRepository },
    { provide: INVITATION_REPOSITORY, useClass: PgInvitationRepository },
    { provide: ACCOUNT_REPOSITORY, useClass: PgAccountRepository },
    { provide: SESSION_STORE, useClass: PgSessionStore },
    { provide: AUDIT_LOG_REPOSITORY, useClass: PgAuditLogRepository },
    { provide: RETENTION_REPOSITORY, useClass: PgRetentionRepository },
    { provide: DELETION_TOKEN_REPOSITORY, useClass: PgDeletionTokenRepository },
    { provide: EMAIL_PORT, useClass: SmtpEmailAdapter },
    { provide: WORLD_TICKET_PORT, useClass: JoseWorldTicketAdapter },
    { provide: PROFILE_REPOSITORY, useClass: PgProfileRepository },
    { provide: AVATAR_REPOSITORY, useClass: PgAvatarRepository },
  ],
})
export class IdentityModule {}
