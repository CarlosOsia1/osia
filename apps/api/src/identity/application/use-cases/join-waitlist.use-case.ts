import { Inject, Injectable } from '@nestjs/common';
import type { WaitlistEntryDto, WaitlistInput } from '@osia/shared';
import {
  WAITLIST_REPOSITORY,
  type WaitlistRepository,
} from '../ports/out/waitlist.repository';

/** Caso de uso: unirse a la waitlist (idempotente por email). El dominio no sabe de HTTP ni SQL. */
@Injectable()
export class JoinWaitlistUseCase {
  constructor(@Inject(WAITLIST_REPOSITORY) private readonly repo: WaitlistRepository) {}

  async execute(input: WaitlistInput): Promise<WaitlistEntryDto> {
    const { entry } = await this.repo.upsertByEmail({
      email: input.email,
      source: input.source,
      meta: input.meta,
    });
    return entry;
  }
}
