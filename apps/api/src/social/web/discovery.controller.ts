import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  searchProfilesQuerySchema,
  type ProfileSummaryDto,
  type SearchProfilesQueryInput,
} from '@osia/shared';
import { ZodValidationPipe } from '../../common/zod-validation.pipe';
import { AuthGuard, CurrentAccount, type AccountContext } from '../../common/auth.guard';
import { DiscoveryService } from '../application/discovery.service';

/**
 * Descubrir personas (S3.11): `GET /v1/search/profiles?q=` (buscar por prefijo) y `GET /v1/discover`
 * (sugeridos a seguir, sin IA/ML). Rutas propias para no chocar con `profiles/:handle`. Protegido.
 */
@Controller()
@UseGuards(AuthGuard)
export class DiscoveryController {
  constructor(private readonly discovery: DiscoveryService) {}

  @Get('search/profiles')
  search(
    @CurrentAccount() account: AccountContext,
    @Query(new ZodValidationPipe(searchProfilesQuerySchema)) query: SearchProfilesQueryInput,
  ): Promise<ProfileSummaryDto[]> {
    return this.discovery.search(account.accountId, query.q);
  }

  @Get('discover')
  suggestions(@CurrentAccount() account: AccountContext): Promise<ProfileSummaryDto[]> {
    return this.discovery.suggestions(account.accountId);
  }
}
