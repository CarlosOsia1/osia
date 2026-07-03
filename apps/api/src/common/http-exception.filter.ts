import { type ArgumentsHost, Catch, type ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import * as Sentry from '@sentry/node';
import type { Request, Response } from 'express';
import { ErrorCode, type ApiError, type ApiErrorEnvelope } from '@osia/shared';
import { AppException } from './app-exception';

/**
 * Filtro global: TODA excepción sale como el sobre `ApiError` de @osia/shared (un solo
 * formato de error en el ecosistema). `code` es la verdad lógica; el `requestId` correlaciona
 * con Pino. Nunca se filtra stack al cliente (docs/10 §1.4, §5).
 */
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();
    const headerId = req.headers['x-request-id'];
    const requestId = (typeof headerId === 'string' ? headerId : undefined) ?? randomUUID();

    const apiError = this.toApiError(exception, requestId);
    if (apiError.status >= 500) {
      this.logger.error({ requestId, err: exception }, apiError.message);
      // Ola 4: reporta el bug a Sentry (no-op si no hay SENTRY_DSN). Solo 5xx: los 4xx son esperados.
      Sentry.captureException(exception, { tags: { requestId } });
    }
    res.setHeader('x-request-id', requestId);
    const body: ApiErrorEnvelope = { error: apiError };
    res.status(apiError.status).json(body);
  }

  private toApiError(exception: unknown, requestId: string): ApiError {
    if (exception instanceof AppException) {
      return {
        code: exception.code,
        message: exception.message,
        status: exception.status,
        requestId,
        retryable: exception.options.retryable ?? false,
        ...(exception.options.details ? { details: exception.options.details } : {}),
      };
    }
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      return {
        code: statusToCode(status),
        message: exception.message,
        status,
        requestId,
        retryable: status >= 500,
      };
    }
    return {
      code: ErrorCode.INTERNAL_ERROR,
      message: 'Error interno.',
      status: 500,
      requestId,
      retryable: true,
    };
  }
}

/** HTTP status → código estable de @osia/shared (para errores no-AppException). */
function statusToCode(status: number): ErrorCode {
  switch (status) {
    case 400:
      return ErrorCode.BAD_REQUEST;
    case 401:
      return ErrorCode.UNAUTHENTICATED;
    case 403:
      return ErrorCode.FORBIDDEN;
    case 404:
      return ErrorCode.NOT_FOUND;
    case 409:
      return ErrorCode.CONFLICT;
    case 422:
      return ErrorCode.VALIDATION_FAILED;
    case 429:
      return ErrorCode.RATE_LIMITED;
    case 503:
      return ErrorCode.UPSTREAM_UNAVAILABLE;
    default:
      return ErrorCode.INTERNAL_ERROR;
  }
}
