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
import { GetPostUseCase } from './application/use-cases/get-post.use-case';
import { DeletePostUseCase } from './application/use-cases/delete-post.use-case';
import { ListReactionsUseCase } from './application/use-cases/list-reactions.use-case';
import { STORAGE_PORT } from './application/ports/out/storage.port';
import { SupabaseStorageAdapter } from './infrastructure/storage/supabase-storage.adapter';
import { POST_REPOSITORY } from './application/ports/out/post.repository';
import { PgPostRepository } from './infrastructure/persistence/post.repository';
import { ReactionController } from './web/reaction.controller';
import { SetReactionUseCase } from './application/use-cases/set-reaction.use-case';
import { RemoveReactionUseCase } from './application/use-cases/remove-reaction.use-case';
import { REACTION_REPOSITORY } from './application/ports/out/reaction.repository';
import { PgReactionRepository } from './infrastructure/persistence/reaction.repository';
import { PostCommentsController, CommentsController } from './web/comment.controller';
import { CreateCommentUseCase } from './application/use-cases/create-comment.use-case';
import { ListCommentsUseCase } from './application/use-cases/list-comments.use-case';
import { DeleteCommentUseCase } from './application/use-cases/delete-comment.use-case';
import { COMMENT_REPOSITORY } from './application/ports/out/comment.repository';
import { PgCommentRepository } from './infrastructure/persistence/comment.repository';
import { FeedController } from './web/feed.controller';
import { GetFeedUseCase } from './application/use-cases/get-feed.use-case';
import { FanOutPostUseCase } from './application/use-cases/fan-out-post.use-case';
import { FeedFanoutListener } from './infrastructure/messaging/feed-fanout.listener';
import { FeedRetentionService } from './application/feed-retention.service';
import { FEED_REPOSITORY } from './application/ports/out/feed.repository';
import { PgFeedRepository } from './infrastructure/persistence/feed.repository';
import { NotificationController } from './web/notification.controller';
import { CreateNotificationUseCase } from './application/use-cases/create-notification.use-case';
import { GetNotificationsUseCase } from './application/use-cases/get-notifications.use-case';
import { MarkNotificationsReadUseCase } from './application/use-cases/mark-notifications-read.use-case';
import { NotificationListener } from './infrastructure/messaging/notification.listener';
import { NOTIFICATION_REPOSITORY } from './application/ports/out/notification.repository';
import { PgNotificationRepository } from './infrastructure/persistence/notification.repository';
import { PresenceController } from './web/presence.controller';
import { GetPresenceUseCase } from './application/use-cases/get-presence.use-case';
import { PRESENCE_QUERY } from './application/ports/out/presence.query';
import { PgPresenceQuery } from './infrastructure/persistence/presence.query';
import { PublicProfileController } from './web/public-profile.controller';
import { GetPublicProfileUseCase } from './application/use-cases/get-public-profile.use-case';
import { ListProfilePostsUseCase } from './application/use-cases/list-profile-posts.use-case';
import { PROFILE_QUERY } from './application/ports/out/profile.query';
import { PgProfileQuery } from './infrastructure/persistence/profile.query';
import { ReportController } from './web/report.controller';
import { CreateReportUseCase } from './application/use-cases/create-report.use-case';
import { REPORT_REPOSITORY } from './application/ports/out/report.repository';
import { PgReportRepository } from './infrastructure/persistence/report.repository';
import { EmailVerifiedGuard } from '../common/email-verified.guard';
import { MetricsController } from './web/metrics.controller';
import { METRICS_QUERY } from './application/ports/out/metrics.query';
import { PgMetricsQuery } from './infrastructure/persistence/metrics.query';
import { ProfileMeController } from './web/profile-me.controller';
import { UpdateProfileCardUseCase } from './application/use-cases/update-profile-card.use-case';
import { CreateProfileMediaUploadUrlUseCase } from './application/use-cases/create-profile-media-upload-url.use-case';
import { PROFILE_CARD_REPOSITORY } from './application/ports/out/profile-card.repository';
import { PgProfileCardRepository } from './infrastructure/persistence/profile-card.repository';
import { PROFILE_MEDIA_STORAGE } from './application/ports/out/profile-media.storage.port';
import { SupabaseProfileMediaAdapter } from './infrastructure/storage/supabase-profile-media.adapter';
import { FollowRequestsController } from './web/follow-requests.controller';
import { AcceptFollowRequestUseCase } from './application/use-cases/accept-follow-request.use-case';
import { RejectFollowRequestUseCase } from './application/use-cases/reject-follow-request.use-case';

/**
 * Bounded context `social` (Fase 3 — NestJS hexagonal, espejo de `identity`): web (controllers) →
 * application (use cases + ports) → infrastructure (adapters). Los ports se inyectan por token; los
 * adapters concretos solo se cablean aquí. Cada slice vertical (puerto + adapter + caso de uso) se
 * agrega en su sprint: S3.1-H2 salud; S3.2-H1 grafo (follows); S3.2-H3 publicación de eventos de
 * dominio (`social.follow.created`/`social.post.reacted`, que consume `economy` para reputación);
 * S3.3-H1 media (upload-url) + publicar post; S3.3-H2 reaccionar; S3.3-H3 comentar; S3.3-H4 feed
 * (fan-out-on-write + lectura + poda); S3.4-H2 notificaciones (consume social.* + menciones). Falta
 * presencia (S3.4-H1, lee Redis del world-server).
 */
@Module({
  controllers: [
    SocialHealthController,
    FollowController,
    FollowGraphController,
    MediaController,
    PostController,
    ReactionController,
    PostCommentsController,
    CommentsController,
    FeedController,
    NotificationController,
    PresenceController,
    PublicProfileController,
    ReportController,
    MetricsController,
    ProfileMeController,
    FollowRequestsController,
  ],
  providers: [
    SocialHealthService,
    FollowAccountUseCase,
    UnfollowAccountUseCase,
    FollowGraphService,
    CreateUploadUrlUseCase,
    CreatePostUseCase,
    GetPostUseCase,
    DeletePostUseCase,
    SetReactionUseCase,
    RemoveReactionUseCase,
    ListReactionsUseCase,
    CreateCommentUseCase,
    ListCommentsUseCase,
    DeleteCommentUseCase,
    GetFeedUseCase,
    FanOutPostUseCase,
    FeedFanoutListener,
    FeedRetentionService,
    CreateNotificationUseCase,
    GetNotificationsUseCase,
    MarkNotificationsReadUseCase,
    NotificationListener,
    GetPresenceUseCase,
    GetPublicProfileUseCase,
    ListProfilePostsUseCase,
    CreateReportUseCase,
    EmailVerifiedGuard,
    { provide: SOCIAL_HEALTH_PORT, useClass: PgSocialHealthRepository },
    { provide: FOLLOW_REPOSITORY, useClass: PgFollowRepository },
    { provide: SOCIAL_EVENT_PUBLISHER, useClass: EventEmitterSocialPublisher },
    { provide: STORAGE_PORT, useClass: SupabaseStorageAdapter },
    { provide: POST_REPOSITORY, useClass: PgPostRepository },
    { provide: REACTION_REPOSITORY, useClass: PgReactionRepository },
    { provide: COMMENT_REPOSITORY, useClass: PgCommentRepository },
    { provide: FEED_REPOSITORY, useClass: PgFeedRepository },
    { provide: NOTIFICATION_REPOSITORY, useClass: PgNotificationRepository },
    { provide: PRESENCE_QUERY, useClass: PgPresenceQuery },
    { provide: PROFILE_QUERY, useClass: PgProfileQuery },
    { provide: REPORT_REPOSITORY, useClass: PgReportRepository },
    { provide: METRICS_QUERY, useClass: PgMetricsQuery },
    UpdateProfileCardUseCase,
    CreateProfileMediaUploadUrlUseCase,
    AcceptFollowRequestUseCase,
    RejectFollowRequestUseCase,
    { provide: PROFILE_CARD_REPOSITORY, useClass: PgProfileCardRepository },
    { provide: PROFILE_MEDIA_STORAGE, useClass: SupabaseProfileMediaAdapter },
  ],
})
export class SocialModule {}
