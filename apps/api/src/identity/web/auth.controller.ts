import { Controller, Get } from '@nestjs/common';
import { ErrorCode } from '@osia/shared';
import { AppException } from '../../common/app-exception';

/**
 * Controlador de auth (contexto identity). En S1.3-H3 implementa login/refresh/logout/session
 * reales. Por ahora `GET /v1/auth/session` es un stub que ancla el contrato y prueba el filtro:
 * sin token válido → 401 UNAUTHENTICATED (sobre ApiError).
 */
@Controller('auth')
export class AuthController {
  @Get('session')
  session(): never {
    throw new AppException(ErrorCode.UNAUTHENTICATED, 401, 'No hay sesión activa.');
  }
}
