import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { updateProfileSchema, type ProfileDto, type UpdateProfileInput } from '@osia/shared';
import { ZodValidationPipe } from '../../common/zod-validation.pipe';
import { AuthGuard, CurrentAccount, type AccountContext } from '../../common/auth.guard';
import { ProfileService } from '../application/profile.service';

/**
 * Perfil propio (S1.6-H1): ver/editar. Protegido (AuthGuard). La vista pública por handle vive en
 * `social/PublicProfileController` (`GET /v1/profiles/{handle}`, S3.5-H1): declararla también aquí
 * la tapaba (Nest enruta al primer módulo registrado) y el perfil llegaba sin `viewerState`.
 */
@Controller('profiles')
@UseGuards(AuthGuard)
export class ProfileController {
  constructor(private readonly profiles: ProfileService) {}

  @Get('me')
  async me(@CurrentAccount() account: AccountContext): Promise<{ profile: ProfileDto }> {
    return { profile: await this.profiles.getMine(account.accountId) };
  }

  @Patch('me')
  async update(
    @CurrentAccount() account: AccountContext,
    @Body(new ZodValidationPipe(updateProfileSchema)) body: UpdateProfileInput,
  ): Promise<{ profile: ProfileDto }> {
    return { profile: await this.profiles.update(account.accountId, body) };
  }
}
