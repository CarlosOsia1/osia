import { Body, Controller, Get, HttpCode, Post, UsePipes } from '@nestjs/common';
import { ErrorCode, signupSchema, type SignupInput, type SignupResultDto } from '@osia/shared';
import { AppException } from '../../common/app-exception';
import { ZodValidationPipe } from '../../common/zod-validation.pipe';
import { SignupUseCase } from '../application/use-cases/signup.use-case';

/**
 * Auth (contexto identity). `signup` aplica el gate invite-only server-side (S1.3-H2).
 * login/refresh/logout/session reales llegan en S1.3-H3; por ahora `session` es un stub 401.
 */
@Controller('auth')
export class AuthController {
  constructor(private readonly signupUseCase: SignupUseCase) {}

  @Post('signup')
  @HttpCode(201)
  @UsePipes(new ZodValidationPipe(signupSchema))
  async signup(@Body() body: SignupInput): Promise<SignupResultDto> {
    return this.signupUseCase.execute(body);
  }

  @Get('session')
  session(): never {
    throw new AppException(ErrorCode.UNAUTHENTICATED, 401, 'No hay sesión activa.');
  }
}
