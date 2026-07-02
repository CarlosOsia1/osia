import type { ArgumentMetadata, PipeTransform } from '@nestjs/common';
import { z, type ZodTypeAny } from 'zod';
import { ErrorCode, type ApiErrorDetail } from '@osia/shared';
import { AppException } from './app-exception';

/**
 * Valida el body/query/param contra un esquema Zod de @osia/shared (mismo esquema que el cliente,
 * docs/10 §5.3). En fallo → `422 VALIDATION_FAILED` con `details[]` campo a campo. Acepta cualquier
 * schema, incluidos los que transforman (input ≠ output, p.ej. CSV→array o coerciones).
 *
 * Metadata-aware: cuando se aplica a nivel de método con `@UsePipes(...)`, Nest lo corre para TODOS
 * los parámetros del handler — incluidos los decoradores custom (`@CurrentAccount`, `@Res`), que NO
 * son datos a validar. Solo valida body/query/param y deja pasar el resto intacto; así `@UsePipes`
 * deja de ser un footgun (antes rompía en runtime al validar los param decorators).
 */
export class ZodValidationPipe<S extends ZodTypeAny> implements PipeTransform<unknown, z.infer<S>> {
  constructor(private readonly schema: S) {}

  transform(value: unknown, metadata?: ArgumentMetadata): z.infer<S> {
    if (metadata && metadata.type !== 'body' && metadata.type !== 'query' && metadata.type !== 'param') {
      return value as z.infer<S>; // custom (@CurrentAccount) / @Res: no es payload a validar
    }
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
