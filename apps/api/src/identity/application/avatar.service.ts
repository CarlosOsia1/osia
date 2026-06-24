import { Inject, Injectable } from '@nestjs/common';
import { ErrorCode, type AvatarDto, type UpdateAvatarInput } from '@osia/shared';
import { AppException } from '../../common/app-exception';
import { AVATAR_REPOSITORY, type AvatarRepository } from './ports/out/avatar.repository';

/** Lectura/edición del avatar activo (S1.6-H2). */
@Injectable()
export class AvatarService {
  constructor(@Inject(AVATAR_REPOSITORY) private readonly repo: AvatarRepository) {}

  async getMine(accountId: string): Promise<AvatarDto> {
    const avatar = await this.repo.getActive(accountId);
    if (!avatar) throw new AppException(ErrorCode.NOT_FOUND, 404, 'Avatar no encontrado.');
    return avatar;
  }

  async update(accountId: string, patch: UpdateAvatarInput): Promise<AvatarDto> {
    return this.repo.updateActiveConfig(accountId, patch);
  }
}
