/**
 * DTOs de sesión y resultado de signup (docs/10 §2.1).
 *
 * `AccountDto` es la cara de identidad (email/estado/rol) — distinta del pasaporte público.
 * `SessionDto` es lo que devuelve `GET /v1/auth/session`: el access JWT corto + el pasaporte.
 */

import type { AccountId } from '../../domain/ids';
import type { AccountRole, AccountStatus } from '../../domain/enums';
import type { Passport } from './passport';
import type { ProfileDto } from './profile';

/** Datos de cuenta (no se filtra `password_hash` ni columnas internas, docs/10 §6.3). */
export type AccountDto = {
  accountId: AccountId;
  email: string;
  status: AccountStatus;
  role: AccountRole;
  emailVerified: boolean;
  /** ISO-8601 UTC. */
  createdAt: string;
};

/** Respuesta de `GET /v1/auth/session`: access token corto + pasaporte. */
export type SessionDto = {
  /** JWT de acceso, vida ~10 min; el cliente lo manda en `Authorization: Bearer`. */
  accessToken: string;
  /** Segundos hasta expirar. */
  expiresIn: number;
  passport: Passport;
};

/** Respuesta `201` de `POST /v1/auth/signup`: cuenta + perfil + sesión iniciada. */
export type SignupResultDto = {
  account: AccountDto;
  profile: ProfileDto;
  session: SessionDto;
};
