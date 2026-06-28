/**
 * Sobre de error estándar del ecosistema (docs/10 §1.4 y §5.1) — única fuente de verdad.
 *
 * `code` es la verdad lógica (estable, SCREAMING_SNAKE); `message` es copy es-CO mostrable
 * que puede cambiar sin romper clientes. Todo error de `apps/api` —de cualquier dominio—
 * viaja con esta forma; el cliente tiene un solo manejador.
 *
 * El catálogo de códigos se define completo (contrato listo), aunque cada dominio se
 * implemente por fase (docs/10 §2: cobertura por fase). El contract-test de S1.9 verifica
 * que cada `code` emitido por `apps/api` exista aquí.
 */

/** Taxonomía estable de códigos de error (docs/10 §5.1). La lógica del cliente matchea `code`. */
export const ErrorCode = {
  // auth / identidad
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  EMAIL_NOT_VERIFIED: 'EMAIL_NOT_VERIFIED',
  ALREADY_VERIFIED: 'ALREADY_VERIFIED',
  NOT_INVITED: 'NOT_INVITED',
  INVITATION_EXPIRED: 'INVITATION_EXPIRED',
  NO_INVITE_QUOTA: 'NO_INVITE_QUOTA',
  ALREADY_INVITED: 'ALREADY_INVITED',
  ALREADY_QUEUED: 'ALREADY_QUEUED',
  HANDLE_TAKEN: 'HANDLE_TAKEN',
  // genéricos
  BAD_REQUEST: 'BAD_REQUEST',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  UPSTREAM_UNAVAILABLE: 'UPSTREAM_UNAVAILABLE',
  // dominio social / economía / plots (contrato listo; se implementan Fase 3+)
  ALREADY_FOLLOWING: 'ALREADY_FOLLOWING',
  CANNOT_FOLLOW_SELF: 'CANNOT_FOLLOW_SELF',
  ALREADY_REACTED: 'ALREADY_REACTED',
  INSUFFICIENT_POINTS: 'INSUFFICIENT_POINTS',
  ALREADY_OWNED: 'ALREADY_OWNED',
  PLOT_TAKEN: 'PLOT_TAKEN',
  MAX_OWNERS: 'MAX_OWNERS',
  AI_BUDGET_EXCEEDED: 'AI_BUDGET_EXCEEDED',
  // realtime (llegan por el evento ERROR 0x8E del world-server)
  VERSION_MISMATCH: 'VERSION_MISMATCH',
  TICKET_INVALID: 'TICKET_INVALID',
  INSTANCE_FULL: 'INSTANCE_FULL',
  PORTAL_DENIED: 'PORTAL_DENIED',
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

// Set para lookup O(1) en `isErrorCode`.
const ERROR_CODE_SET: ReadonlySet<string> = new Set(Object.values(ErrorCode));

/** Guard de narrowing: ¿este string es un código de error conocido? */
export function isErrorCode(value: unknown): value is ErrorCode {
  return typeof value === 'string' && ERROR_CODE_SET.has(value);
}

/** Error de validación campo a campo (solo en `422 VALIDATION_FAILED`, docs/10 §1.4). */
export type ApiErrorDetail = {
  field: string;
  code: string;
  message: string;
};

/** Cuerpo del error (lo que vive bajo `error` en el sobre). */
export type ApiError = {
  /** Verdad lógica, estable. El cliente decide por aquí, no por `message`. */
  code: ErrorCode;
  /** Copy es-CO mostrable al usuario en el peor caso. */
  message: string;
  /** Espejo del HTTP status. */
  status: number;
  /** Correlación con Pino + Sentry. */
  requestId: string;
  /** Solo en validación (`422`). */
  details?: ApiErrorDetail[];
  /** Pista canónica para el cliente: ¿tiene sentido reintentar? (docs/10 §5.2). */
  retryable: boolean;
};

/** El sobre tal cual viaja por el cable: `{ error: ApiError }`. */
export type ApiErrorEnvelope = {
  error: ApiError;
};
