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
import { SOCIAL_EVENT_PUBLISHER } from './application/ports/out/social-event-publisher.port';
import { EventEmitterSocialPublisher } from './infrastructure/messaging/event-emitter-social-publisher';
import { MediaController } from './web/media.controller';
import { PostController } from './web/post.controller';
import { CreateUploadUrlUseCase } from './application/use-cases/create-upload-url.use-case';
import { CreatePostUseCase } from './application/use-cases/create-post.use-case';
import { STORAGE_PORT } from './application/ports/out/storage.port';
import { SupabaseStorageAdapter } from './infrastructure/storage/supabase-storage.adapter';
import { POST_REPOSITORY } from './application/ports/out/post.repository';
import { PgPostRepository } from './infrastructure/persistence/post.repository';
import { ReactionController } from './web/reaction.controller';
import { SetReactionUseCase } from './application/use-cases/set-reaction.use-case';
import { RemoveReactionUseCase } from './application/use-cases/remove-reaction.use-case';
import { REACTION_REPOSITORY } from './application/ports/out/reaction.repository';
import { PgReactionRepository } from './infrastructure/persistence/reaction.repository';

/**
 * Bounded context `social` (Fase 3 — NestJS hexagonal, espejo de `identity`): web (controllers) →
 * application (use cases + ports) → infrastructure (adapters). Los ports se inyectan por token; los
 * adapters concretos solo se cablean aquí. Cada slice vertical (puerto + adapter + caso de uso) se
 * agrega en su sprint: S3.1-H2 salud; S3.2-H1 grafo (follows); S3.2-H3 publicación de eventos de
 * dominio (`social.follow.created`/`social.post.reacted`, que consume `economy` para reputación);
 * S3.3-H1 media (upload-url) + publicar post; S3.3-H2 reaccionar. Faltan comentarios/feed/notificaciones/
 * presencia (S3.3-H3..H4, S3.4).
 */
@Module({
  controllers: [
    SocialHealthController,
    FollowController,
    FollowGraphController,
    MediaController,
    PostController,
    ReactionController,
  ],
  providers: [
    SocialHealthService,
    FollowAccountUseCase,
    UnfollowAccountUseCase,
    FollowGraphService,
    CreateUploadUrlUseCase,
    CreatePostUseCase,
    SetReactionUseCase,
    RemoveReactionUseCase,
    { provide: SOCIAL_HEALTH_PORT, useClass: PgSocialHealthRepository },
    { provide: FOLLOW_REPOSITORY, useClass: PgFollowRepository },
    { provide: SOCIAL_EVENT_PUBLISHER, useClass: EventEmitterSocialPublisher },
    { provide: STORAGE_PORT, useClass: SupabaseStorageAdapter },
    { provide: POST_REPOSITORY, useClass: PgPostRepository },
    { provide: REACTION_REPOSITORY, useClass: PgReactionRepository },
  ],
})
export class SocialModule {}
