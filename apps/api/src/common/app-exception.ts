import type { ApiErrorDetail, ErrorCode } from '@osia/shared';

/**
 * Excepción de dominio/aplicación de OSIA. El filtro global la mapea 1:1 al sobre `ApiError`
 * (docs/10 §1.4). El dominio lanza esto (con un `ErrorCode` estable), nunca arma HTTP a mano.
 */
export class AppException extends Error {
  constructor(
    readonly code: ErrorCode,
    readonly status: number,
    message: string,
    readonly options: { retryable?: boolean; details?: ApiErrorDetail[] } = {},
  ) {
    super(message);
    this.name = 'AppException';
  }
}
