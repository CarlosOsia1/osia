import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  presenceQuerySchema,
  type NetworkPresenceEntryDto,
  type PresenceEntryDto,
  type PresenceQueryInput,
} from '@osia/shared';
import { ZodValidationPipe } from '../../common/zod-validation.pipe';
import { AuthGuard, CurrentAccount, type AccountContext } from '../../common/auth.guard';
import { GetPresenceUseCase } from '../application/use-cases/get-presence.use-case';
import { GetNetworkPresenceUseCase } from '../application/use-cases/get-network-presence.use-case';

/**
 * Presencia social (S3.4-H1): `GET /v1/presence?accountIds=a,b,c` → quién está online y en qué zona,
 * solo de las cuentas en relación con el solicitante. `GET /v1/presence/network` (R2) → quién de tu
 * red está en El Mundo ahora (rail del Salón), sin que el cliente conozca accountIds. AuthGuard.
 */
@Controller('presence')
@UseGuards(AuthGuard)
export class PresenceController {
  constructor(
    private readonly getPresence: GetPresenceUseCase,
    private readonly getNetworkPresence: GetNetworkPresenceUseCase,
  ) {}

  @Get()
  async list(
    @CurrentAccount() account: AccountContext,
    @Query(new ZodValidationPipe(presenceQuerySchema)) query: PresenceQueryInput,
  ): Promise<{ presence: PresenceEntryDto[] }> {
    return { presence: await this.getPresence.execute(account.accountId, query) };
  }

  @Get('network')
  async network(
    @CurrentAccount() account: AccountContext,
  ): Promise<{ presence: NetworkPresenceEntryDto[] }> {
    return { presence: await this.getNetworkPresence.execute(account.accountId) };
  }
}
