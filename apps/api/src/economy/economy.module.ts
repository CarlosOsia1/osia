import { Module } from '@nestjs/common';
import { CreditReputationOnFollowUseCase } from './application/use-cases/credit-reputation-on-follow.use-case';
import { CreditReputationOnReactionUseCase } from './application/use-cases/credit-reputation-on-reaction.use-case';
import { REPUTATION_LEDGER } from './application/ports/out/reputation-ledger.port';
import { PgReputationLedger } from './infrastructure/persistence/reputation-ledger.repository';
import { FollowReputationListener } from './infrastructure/messaging/follow-reputation.listener';
import { ReactionReputationListener } from './infrastructure/messaging/reaction-reputation.listener';

/**
 * Bounded context `economy` (Fase 3 — NestJS hexagonal, espejo de `social`/`identity`). Reputación
 * derivada del ledger: los listeners traducen eventos `social.*` (follow.created S3.2-H3, post.reacted
 * S3.3-H2) a asientos del `reputation_ledger`, y el caché en `identity.profiles` lo mantiene un trigger
 * SQL. `PG_POOL` viene del `PostgresModule` global. Crecerá con popularidad/economía en HUs siguientes.
 */
@Module({
  providers: [
    CreditReputationOnFollowUseCase,
    CreditReputationOnReactionUseCase,
    FollowReputationListener,
    ReactionReputationListener,
    { provide: REPUTATION_LEDGER, useClass: PgReputationLedger },
  ],
})
export class EconomyModule {}
