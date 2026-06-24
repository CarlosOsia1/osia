/**
 * Errores de dominio de identidad. Los repos los lanzan; el caso de uso los traduce al
 * `AppException` con su `ErrorCode`/status (la infra no conoce HTTP).
 */

/** El handle elegido ya está tomado (choque de unicidad). */
export class HandleTakenError extends Error {
  constructor() {
    super('handle ya tomado');
    this.name = 'HandleTakenError';
  }
}

/** La invitación dejó de estar disponible entre la validación y el canje (carrera). */
export class InvitationConflictError extends Error {
  constructor() {
    super('invitación no disponible');
    this.name = 'InvitationConflictError';
  }
}

/** Credenciales inválidas en login. */
export class InvalidCredentialsError extends Error {
  constructor() {
    super('credenciales inválidas');
    this.name = 'InvalidCredentialsError';
  }
}

/** Email aún sin verificar (no puede iniciar sesión / operar). */
export class EmailNotVerifiedError extends Error {
  constructor() {
    super('email no verificado');
    this.name = 'EmailNotVerifiedError';
  }
}

/** La sesión (refresh token) expiró o fue revocada. */
export class SessionExpiredError extends Error {
  constructor() {
    super('sesión expirada');
    this.name = 'SessionExpiredError';
  }
}

/** El código de verificación (OTP) es inválido o expiró. */
export class InvalidOtpError extends Error {
  constructor() {
    super('código inválido o expirado');
    this.name = 'InvalidOtpError';
  }
}
