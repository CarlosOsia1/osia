import { Module } from '@nestjs/common';
import { SocialHealthController } from './web/social-health.controller';
import { SocialHealthService } from './application/social-health.service';
import { SOCIAL_HEALTH_PORT } from './application/ports/out/social-health.port';
import { PgSocialHealthRepository } from './infrastructure/persistence/social-health.repository';
import { FollowController } from './web/follow.controller';
import { FollowGraphController } from './web/follow-graph.controller';
import { FollowAccountUseCase } from './application/use-cases/follow-account.use-case';
import { UnfollowAccountUseCase } from './application/use-cases/unfollow-account.use-case';
import { FollowGraphService } from './application/follow-graph.service';
import { FOLLOW_REPOSITORY } from './application/ports/out/follow.repository';
import { PgFollowRepository } from './infrastructure/persistence/follow.repository';

/**
 * Bounded context `social` (Fase 3 — NestJS hexagonal, espejo de `identity`): web (controllers) →
 * application (use cases + ports) → infrastructure (adapters). Los ports se inyectan por token; los
 * adapters concretos solo se cablean aquí. Cada slice vertical (puerto + adapter + caso de uso) se
 * agrega en su sprint: S3.1-H2 salud; S3.2-H1 grafo (follows). Faltan posts/reacciones/comentarios/
 * feed/notificaciones/presencia (S3.3–S3.4).
 */
@Module({
  controllers: [SocialHealthController, FollowController, FollowGraphController],
  providers: [
    SocialHealthService,
    FollowAccountUseCase,
    UnfollowAccountUseCase,
    FollowGraphService,
    { provide: SOCIAL_HEALTH_PORT, useClass: PgSocialHealthRepository },
    { provide: FOLLOW_REPOSITORY, useClass: PgFollowRepository },
  ],
})
export class SocialModule {}
