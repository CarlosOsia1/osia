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
