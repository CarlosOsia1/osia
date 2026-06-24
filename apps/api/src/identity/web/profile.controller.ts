import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import {
  updateProfileSchema,
  type ProfileBrief,
  type ProfileDto,
  type UpdateProfileInput,
} from '@osia/shared';
import { ZodValidationPipe } from '../../common/zod-validation.pipe';
import { AuthGuard, CurrentAccount, type AccountContext } from '../../common/auth.guard';
import { ProfileService } from '../application/profile.service';

/** Perfil (S1.6-H1): ver/editar el propio + ver el público por handle. Protegido (AuthGuard). */
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

  // 'me' se declara antes que ':handle' para que /profiles/me no caiga en el param.
  @Get(':handle')
  async byHandle(@Param('handle') handle: string): Promise<{ profile: ProfileBrief }> {
    return { profile: await this.profiles.getPublic(handle) };
  }
}
