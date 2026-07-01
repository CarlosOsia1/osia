import { Inject, Injectable } from '@nestjs/common';
import type { ProfileSummaryDto } from '@osia/shared';
import { DISCOVERY_QUERY, type DiscoveryQueryPort } from './ports/out/discovery.query';

/** Descubrir personas (S3.11): buscar por prefijo y sugerir a quién seguir (topes fijos, sin cursor). */
@Injectable()
export class DiscoveryService {
  private static readonly SEARCH_LIMIT = 10;
  private static readonly SUGGEST_LIMIT = 20;

  constructor(@Inject(DISCOVERY_QUERY) private readonly discovery: DiscoveryQueryPort) {}

  search(viewerAccountId: string, q: string): Promise<ProfileSummaryDto[]> {
    return this.discovery.search(viewerAccountId, q, DiscoveryService.SEARCH_LIMIT);
  }

  suggestions(viewerAccountId: string): Promise<ProfileSummaryDto[]> {
    return this.discovery.suggestions(viewerAccountId, DiscoveryService.SUGGEST_LIMIT);
  }
}
