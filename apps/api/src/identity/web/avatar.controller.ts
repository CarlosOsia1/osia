import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { updateAvatarSchema, type AvatarDto, type UpdateAvatarInput } from '@osia/shared';
import { ZodValidationPipe } from '../../common/zod-validation.pipe';
import { AuthGuard, CurrentAccount, type AccountContext } from '../../common/auth.guard';
import { AvatarService } from '../application/avatar.service';

/** Avatar activo (S1.6-H2): ver/editar la config discreta. Protegido (AuthGuard). */
@Controller('avatars')
@UseGuards(AuthGuard)
export class AvatarController {
  constructor(private readonly avatars: AvatarService) {}

  @Get('me')
  async mine(@CurrentAccount() account: AccountContext): Promise<{ avatar: AvatarDto }> {
    return { avatar: await this.avatars.getMine(account.accountId) };
  }

  @Patch('me')
  async update(
    @CurrentAccount() account: AccountContext,
    @Body(new ZodValidationPipe(updateAvatarSchema)) body: UpdateAvatarInput,
  ): Promise<{ avatar: AvatarDto }> {
    return { avatar: await this.avatars.update(account.accountId, body) };
  }
}
