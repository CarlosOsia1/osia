import { Body, Controller, HttpCode, Patch, Post, UseGuards } from '@nestjs/common';
import {
  createProfileMediaUploadUrlSchema,
  updateProfileCardSchema,
  type CreateProfileMediaUploadUrlInput,
  type UpdateProfileCardInput,
  type UploadTargetDto,
} from '@osia/shared';
import { ZodValidationPipe } from '../../common/zod-validation.pipe';
import { AuthGuard, CurrentAccount, type AccountContext } from '../../common/auth.guard';
import { EmailVerifiedGuard } from '../../common/email-verified.guard';
import { UpdateProfileCardUseCase } from '../application/use-cases/update-profile-card.use-case';
import { CreateProfileMediaUploadUrlUseCase } from '../application/use-cases/create-profile-media-upload-url.use-case';

/**
 * Tarjeta social propia (S3.8): privacidad + foto/portada. Rutas distintas a las de identity
 * (`PATCH /v1/profiles/me` edita nombre/bio) para NO colisionar: aquí `me/card` y `me/media/upload-url`.
 * Protegido (AuthGuard) + email verificado para escribir.
 */
@Controller('profiles')
@UseGuards(AuthGuard)
export class ProfileMeController {
  constructor(
    private readonly updateCard: UpdateProfileCardUseCase,
    private readonly createMediaUrl: CreateProfileMediaUploadUrlUseCase,
  ) {}

  @Patch('me/card')
  @HttpCode(204)
  @UseGuards(EmailVerifiedGuard)
  async patchCard(
    @CurrentAccount() account: AccountContext,
    @Body(new ZodValidationPipe(updateProfileCardSchema)) body: UpdateProfileCardInput,
  ): Promise<void> {
    await this.updateCard.execute(account.accountId, body);
  }

  @Post('me/media/upload-url')
  @UseGuards(EmailVerifiedGuard)
  mediaUploadUrl(
    @CurrentAccount() account: AccountContext,
    @Body(new ZodValidationPipe(createProfileMediaUploadUrlSchema)) body: CreateProfileMediaUploadUrlInput,
  ): Promise<UploadTargetDto> {
    return this.createMediaUrl.execute(account.accountId, body);
  }
}
