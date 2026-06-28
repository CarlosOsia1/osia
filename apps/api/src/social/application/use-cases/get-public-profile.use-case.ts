import { Inject, Injectable } from '@nestjs/common';
import { ErrorCode, type PublicProfileDto } from '@osia/shared';
import { AppException } from '../../../common/app-exception';
import { PROFILE_QUERY, type ProfileQueryPort } from '../ports/out/profile.query';

/** Perfil público con estatus (S3.5-H1): brief + bio + reputación + conteos + isFollowing. 404 si no existe. */
@Injectable()
export class GetPublicProfileUseCase {
  constructor(@Inject(PROFILE_QUERY) private readonly profiles: ProfileQueryPort) {}

  async execute(handle: string, viewerAccountId: string): Promise<PublicProfileDto> {
    const profile = await this.profiles.getPublicProfile(handle, viewerAccountId);
    if (!profile) throw new AppException(ErrorCode.NOT_FOUND, 404, 'Perfil no encontrado.');
    return profile;
  }
}
