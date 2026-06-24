import { Inject, Injectable } from '@nestjs/common';
import { ErrorCode, type ProfileBrief, type ProfileDto, type UpdateProfileInput } from '@osia/shared';
import { AppException } from '../../common/app-exception';
import { PROFILE_REPOSITORY, type ProfileRepository } from './ports/out/profile.repository';

/** Orquesta lectura/edición de perfil (S1.6-H1). La autorización (es el dueño) la da el AuthGuard. */
@Injectable()
export class ProfileService {
  constructor(@Inject(PROFILE_REPOSITORY) private readonly repo: ProfileRepository) {}

  async getMine(accountId: string): Promise<ProfileDto> {
    const profile = await this.repo.getMine(accountId);
    if (!profile) throw new AppException(ErrorCode.NOT_FOUND, 404, 'Perfil no encontrado.');
    return profile;
  }

  async update(accountId: string, patch: UpdateProfileInput): Promise<ProfileDto> {
    return this.repo.update(accountId, patch);
  }

  async getPublic(handle: string): Promise<ProfileBrief> {
    const profile = await this.repo.getPublicByHandle(handle);
    if (!profile) throw new AppException(ErrorCode.NOT_FOUND, 404, 'Perfil no encontrado.');
    return profile;
  }
}
