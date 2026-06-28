import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { presenceQuerySchema, type PresenceEntryDto, type PresenceQueryInput } from '@osia/shared';
import { ZodValidationPipe } from '../../common/zod-validation.pipe';
import { AuthGuard, CurrentAccount, type AccountContext } from '../../common/auth.guard';
import { GetPresenceUseCase } from '../application/use-cases/get-presence.use-case';

/**
 * Presencia social (S3.4-H1): `GET /v1/presence?accountIds=a,b,c` → quién está online y en qué zona,
 * solo de las cuentas en relación con el solicitante. Protegido (AuthGuard).
 */
@Controller('presence')
@UseGuards(AuthGuard)
export class PresenceController {
  constructor(private readonly getPresence: GetPresenceUseCase) {}

  @Get()
  async list(
    @CurrentAccount() account: AccountContext,
    @Query(new ZodValidationPipe(presenceQuerySchema)) query: PresenceQueryInput,
  ): Promise<{ presence: PresenceEntryDto[] }> {
    return { presence: await this.getPresence.execute(account.accountId, query) };
  }
}
