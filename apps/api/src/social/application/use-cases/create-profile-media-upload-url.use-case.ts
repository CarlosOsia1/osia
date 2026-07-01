import { Inject, Injectable } from '@nestjs/common';
import type { CreateProfileMediaUploadUrlInput, UploadTargetDto } from '@osia/shared';
import {
  PROFILE_MEDIA_STORAGE,
  type ProfileMediaStoragePort,
} from '../ports/out/profile-media.storage.port';

/** Mintea un destino prefirmado para subir foto o portada de perfil (S3.8). El API nunca ve el binario. */
@Injectable()
export class CreateProfileMediaUploadUrlUseCase {
  constructor(@Inject(PROFILE_MEDIA_STORAGE) private readonly storage: ProfileMediaStoragePort) {}

  execute(accountId: string, input: CreateProfileMediaUploadUrlInput): Promise<UploadTargetDto> {
    return this.storage.createUploadTarget(accountId, input.kind, input.contentType);
  }
}
