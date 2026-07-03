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
import { OutboxSocialPublisher } from './infrastructure/messaging/outbox-social-publisher';
import { OUTBOX_STORE } from './application/ports/out/outbox.store';
import { PgOutboxStore } from './infrastructure/persistence/outbox.repository';
import { OutboxDispatcher } from './infrastructure/messaging/outbox.dispatcher';
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
import { GetNetworkPresenceUseCase } from './application/use-cases/get-network-presence.use-case';
import { UpdatePostUseCase } from './application/use-cases/update-post.use-case';
import { UpdateCommentUseCase } from './application/use-cases/update-comment.use-case';
import { CreateEchoUseCase, RemoveEchoUseCase } from './application/use-cases/echo.use-cases';
import { ModerationController } from './web/moderation.controller';
import {
  BlockAccountUseCase,
  ListBlockedUseCase,
  ListMutedUseCase,
  MuteAccountUseCase,
  UnblockAccountUseCase,
  UnmuteAccountUseCase,
} from './application/use-cases/moderation.use-cases';
import { MUTE_REPOSITORY } from './application/ports/out/mute.repository';
import { DmController } from './web/dm.controller';
import {
  DeleteMessageUseCase,
  ListConversationsUseCase,
  ListMessagesUseCase,
  MarkConversationReadUseCase,
  OpenConversationUseCase,
  SendMessageUseCase,
} from './application/use-cases/dm.use-cases';
import { DM_REPOSITORY } from './application/ports/out/dm.repository';
import { PgDmRepository } from './infrastructure/persistence/dm.repository';
import { PgMuteRepository } from './infrastructure/persistence/mute.repository';
import { BookmarkController } from './web/bookmark.controller';
import {
  ListBookmarksUseCase,
  RemoveBookmarkUseCase,
  SetBookmarkUseCase,
} from './application/use-cases/bookmark.use-cases';
import { BOOKMARK_REPOSITORY } from './application/ports/out/bookmark.repository';
import { PgBookmarkRepository } from './infrastructure/persistence/bookmark.repository';
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
import { DiscoveryController } from './web/discovery.controller';
import { DiscoveryService } from './application/discovery.service';
import { DISCOVERY_QUERY } from './application/ports/out/discovery.query';
import { PgDiscoveryQuery } from './infrastructure/persistence/discovery.query';
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
    BookmarkController,
    ModerationController,
    DmController,
    PublicProfileController,
    ReportController,
    MetricsController,
    ProfileMeController,
    FollowRequestsController,
    DiscoveryController,
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
    GetNetworkPresenceUseCase,
    UpdatePostUseCase,
    UpdateCommentUseCase,
    CreateEchoUseCase,
    RemoveEchoUseCase,
    BlockAccountUseCase,
    UnblockAccountUseCase,
    ListBlockedUseCase,
    MuteAccountUseCase,
    UnmuteAccountUseCase,
    ListMutedUseCase,
    OpenConversationUseCase,
    ListConversationsUseCase,
    ListMessagesUseCase,
    SendMessageUseCase,
    MarkConversationReadUseCase,
    DeleteMessageUseCase,
    SetBookmarkUseCase,
    RemoveBookmarkUseCase,
    ListBookmarksUseCase,
    GetPublicProfileUseCase,
    ListProfilePostsUseCase,
    CreateReportUseCase,
    EmailVerifiedGuard,
    OutboxDispatcher,
    { provide: SOCIAL_HEALTH_PORT, useClass: PgSocialHealthRepository },
    { provide: FOLLOW_REPOSITORY, useClass: PgFollowRepository },
    { provide: SOCIAL_EVENT_PUBLISHER, useClass: OutboxSocialPublisher },
    { provide: OUTBOX_STORE, useClass: PgOutboxStore },
    { provide: STORAGE_PORT, useClass: SupabaseStorageAdapter },
    { provide: POST_REPOSITORY, useClass: PgPostRepository },
    { provide: REACTION_REPOSITORY, useClass: PgReactionRepository },
    { provide: COMMENT_REPOSITORY, useClass: PgCommentRepository },
    { provide: FEED_REPOSITORY, useClass: PgFeedRepository },
    { provide: NOTIFICATION_REPOSITORY, useClass: PgNotificationRepository },
    { provide: PRESENCE_QUERY, useClass: PgPresenceQuery },
    { provide: PROFILE_QUERY, useClass: PgProfileQuery },
    { provide: REPORT_REPOSITORY, useClass: PgReportRepository },
    { provide: BOOKMARK_REPOSITORY, useClass: PgBookmarkRepository },
    { provide: MUTE_REPOSITORY, useClass: PgMuteRepository },
    { provide: DM_REPOSITORY, useClass: PgDmRepository },
    { provide: METRICS_QUERY, useClass: PgMetricsQuery },
    DiscoveryService,
    { provide: DISCOVERY_QUERY, useClass: PgDiscoveryQuery },
    UpdateProfileCardUseCase,
    CreateProfileMediaUploadUrlUseCase,
    AcceptFollowRequestUseCase,
    RejectFollowRequestUseCase,
    { provide: PROFILE_CARD_REPOSITORY, useClass: PgProfileCardRepository },
    { provide: PROFILE_MEDIA_STORAGE, useClass: SupabaseProfileMediaAdapter },
  ],
})
export class SocialModule {}
