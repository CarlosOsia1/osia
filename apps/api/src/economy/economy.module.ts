import { Module } from '@nestjs/common';
import { CreditReputationOnFollowUseCase } from './application/use-cases/credit-reputation-on-follow.use-case';
import { REPUTATION_LEDGER } from './application/ports/out/reputation-ledger.port';
import { PgReputationLedger } from './infrastructure/persistence/reputation-ledger.repository';
import { FollowReputationListener } from './infrastructure/messaging/follow-reputation.listener';

/**
 * Bounded context `economy` (Fase 3 — NestJS hexagonal, espejo de `social`/`identity`). Hoy contiene la
 * reputación derivada del ledger (S3.2-H3): un listener traduce eventos `social.*` a asientos del
 * `reputation_ledger`, y el caché en `identity.profiles` lo mantiene un trigger SQL. `PG_POOL` viene del
 * `PostgresModule` global. Crecerá con popularidad/economía en HUs siguientes (datos, no IA).
 */
@Module({
  providers: [
    CreditReputationOnFollowUseCase,
    FollowReputationListener,
    { provide: REPUTATION_LEDGER, useClass: PgReputationLedger },
  ],
})
export class EconomyModule {}
