import { Inject, Injectable } from '@nestjs/common';
import {
  clampLimit,
  decodeCursor,
  ErrorCode,
  type ListQueryInput,
  type AccountBriefDto,
  type Page,
} from '@osia/shared';
import { AppException } from '../../../common/app-exception';
import { FOLLOW_REPOSITORY, type FollowRepository } from '../ports/out/follow.repository';
import { MUTE_REPOSITORY, type MuteRepository } from '../ports/out/mute.repository';

/**
 * Control del propio espacio (R4.4). BLOQUEAR corta la relación en ambos sentidos (aristas
 * follows fuera, feeds limpios, y `post-visibility` oculta todo entre ambos); SILENCIAR es una
 * preferencia privada de lectura (tu feed y tu campana; la otra persona no lo sabe). Ninguno
 * emite eventos ni notifica — el control del espacio propio es discreto por diseño.
 */
@Injectable()
export class BlockAccountUseCase {
  constructor(@Inject(FOLLOW_REPOSITORY) private readonly follows: FollowRepository) {}

  async execute(blockerAccountId: string, blockedAccountId: string): Promise<void> {
    if (blockerAccountId === blockedAccountId) {
      throw new AppException(ErrorCode.VALIDATION_FAILED, 422, 'No puedes bloquearte a ti.');
    }
    if (!(await this.follows.accountExists(blockedAccountId))) {
      throw new AppException(ErrorCode.NOT_FOUND, 404, 'La cuenta no existe.');
    }
    await this.follows.block(blockerAccountId, blockedAccountId);
  }
}

@Injectable()
export class UnblockAccountUseCase {
  constructor(@Inject(FOLLOW_REPOSITORY) private readonly follows: FollowRepository) {}

  async execute(blockerAccountId: string, blockedAccountId: string): Promise<void> {
    await this.follows.unblock(blockerAccountId, blockedAccountId);
  }
}

@Injectable()
export class ListBlockedUseCase {
  constructor(@Inject(FOLLOW_REPOSITORY) private readonly follows: FollowRepository) {}

  execute(accountId: string, query: ListQueryInput): Promise<Page<AccountBriefDto>> {
    return this.follows.listBlocked(
      accountId,
      clampLimit(query.limit),
      query.cursor ? decodeCursor(query.cursor) : null,
    );
  }
}

@Injectable()
export class MuteAccountUseCase {
  constructor(@Inject(MUTE_REPOSITORY) private readonly mutes: MuteRepository) {}

  async execute(muterAccountId: string, mutedAccountId: string): Promise<void> {
    if (muterAccountId === mutedAccountId) {
      throw new AppException(ErrorCode.VALIDATION_FAILED, 422, 'No puedes silenciarte a ti.');
    }
    const ok = await this.mutes.setMute(muterAccountId, mutedAccountId);
    if (!ok) throw new AppException(ErrorCode.NOT_FOUND, 404, 'La cuenta no existe.');
  }
}

@Injectable()
export class UnmuteAccountUseCase {
  constructor(@Inject(MUTE_REPOSITORY) private readonly mutes: MuteRepository) {}

  execute(muterAccountId: string, mutedAccountId: string): Promise<void> {
    return this.mutes.removeMute(muterAccountId, mutedAccountId);
  }
}

@Injectable()
export class ListMutedUseCase {
  constructor(@Inject(MUTE_REPOSITORY) private readonly mutes: MuteRepository) {}

  execute(accountId: string, query: ListQueryInput): Promise<Page<AccountBriefDto>> {
    return this.mutes.listMuted(
      accountId,
      clampLimit(query.limit),
      query.cursor ? decodeCursor(query.cursor) : null,
    );
  }
}
