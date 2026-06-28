import { Inject, Injectable } from '@nestjs/common';
import type { CreateUploadUrlInput, UploadTargetDto } from '@osia/shared';
import { STORAGE_PORT, type StoragePort } from '../ports/out/storage.port';

/**
 * Prepara la subida de un adjunto de post (S3.3-H1): delega en el `StoragePort` el minteo de un destino
 * prefirmado, scoped a la cuenta autenticada. El `contentType` ya viene validado (allowlist Zod).
 */
@Injectable()
export class CreateUploadUrlUseCase {
  constructor(@Inject(STORAGE_PORT) private readonly storage: StoragePort) {}

  execute(accountId: string, input: CreateUploadUrlInput): Promise<UploadTargetDto> {
    return this.storage.createUploadTarget(accountId, input.contentType);
  }
}
