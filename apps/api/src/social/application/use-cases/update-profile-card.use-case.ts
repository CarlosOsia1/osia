import { Inject, Injectable } from '@nestjs/common';
import { ErrorCode, type UpdateProfileCardInput } from '@osia/shared';
import { AppException } from '../../../common/app-exception';
import {
  PROFILE_CARD_REPOSITORY,
  type ProfileCardRepository,
} from '../ports/out/profile-card.repository';
import {
  PROFILE_MEDIA_STORAGE,
  type ProfileMediaStoragePort,
} from '../ports/out/profile-media.storage.port';

/**
 * Actualiza la tarjeta social propia (S3.8): privacidad y/o foto/portada. Anti-abuso: una URL de media
 * NO nula debe pertenecer a NUESTRO bucket de perfil (no se acepta una URL externa arbitraria como foto).
 * `null` limpia el campo (vuelve al respaldo del avatar).
 */
@Injectable()
export class UpdateProfileCardUseCase {
  constructor(
    @Inject(PROFILE_CARD_REPOSITORY) private readonly cards: ProfileCardRepository,
    @Inject(PROFILE_MEDIA_STORAGE) private readonly storage: ProfileMediaStoragePort,
  ) {}

  async execute(accountId: string, input: UpdateProfileCardInput): Promise<void> {
    if (input.photoUrl && !this.storage.ownsPublicUrl(input.photoUrl)) {
      throw new AppException(ErrorCode.VALIDATION_FAILED, 422, 'La foto debe ser de nuestro almacenamiento.');
    }
    if (input.coverUrl && !this.storage.ownsPublicUrl(input.coverUrl)) {
      throw new AppException(ErrorCode.VALIDATION_FAILED, 422, 'La portada debe ser de nuestro almacenamiento.');
    }
    await this.cards.upsert(accountId, input);
  }
}
