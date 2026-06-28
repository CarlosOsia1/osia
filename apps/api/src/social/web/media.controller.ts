import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { createUploadUrlSchema, type CreateUploadUrlInput, type UploadTargetDto } from '@osia/shared';
import { ZodValidationPipe } from '../../common/zod-validation.pipe';
import { AuthGuard, CurrentAccount, type AccountContext } from '../../common/auth.guard';
import { CreateUploadUrlUseCase } from '../application/use-cases/create-upload-url.use-case';

/**
 * Media de posts (S3.3-H1): `POST /v1/media/upload-url` devuelve un destino prefirmado para subir un
 * adjunto DIRECTO a Storage (el API nunca recibe el binario). Protegido (AuthGuard) + rate-limit global
 * por IP; el bucket por cuenta (`rl:upload`) llega en S3.6.
 */
@Controller('media')
@UseGuards(AuthGuard)
export class MediaController {
  constructor(private readonly createUploadUrl: CreateUploadUrlUseCase) {}

  @Post('upload-url')
  uploadUrl(
    @CurrentAccount() account: AccountContext,
    @Body(new ZodValidationPipe(createUploadUrlSchema)) body: CreateUploadUrlInput,
  ): Promise<UploadTargetDto> {
    return this.createUploadUrl.execute(account.accountId, body);
  }
}
