import type { PipeTransform } from '@nestjs/common';
import { z, type ZodTypeAny } from 'zod';
import { ErrorCode, type ApiErrorDetail } from '@osia/shared';
import { AppException } from './app-exception';

/**
 * Valida el body/query contra un esquema Zod de @osia/shared (mismo esquema que el cliente,
 * docs/10 §5.3). En fallo → `422 VALIDATION_FAILED` con `details[]` campo a campo. Se usa
 * por handler: `@UsePipes(new ZodValidationPipe(signupSchema))`. Acepta cualquier schema, incluidos
 * los que transforman (input ≠ output, p.ej. CSV→array o coerciones); la salida es `z.infer<S>`.
 */
export class ZodValidationPipe<S extends ZodTypeAny> implements PipeTransform<unknown, z.infer<S>> {
  constructor(private readonly schema: S) {}

  transform(value: unknown): z.infer<S> {
    const result = this.schema.safeParse(value);
    if (result.success) return result.data;
    const details: ApiErrorDetail[] = result.error.issues.map((issue) => ({
      field: issue.path.join('.') || '(root)',
      code: issue.code.toUpperCase(),
      message: issue.message,
    }));
    throw new AppException(ErrorCode.VALIDATION_FAILED, 422, 'Validación fallida.', { details });
  }
}
