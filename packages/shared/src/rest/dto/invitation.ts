/**
 * DTOs de invitación y waitlist (docs/10 §2.1; ER §3.4). La escasez es marca: alguien entra
 * a la waitlist → un admin la promueve a una invitación con `code` único y `expiresAt` → el
 * invitado canjea el código. Los `status` son espejo de los CHECK del ER (domain/enums).
 */

import type { InvitationStatus, WaitlistStatus } from '../../domain/enums';

export type InvitationDto = {
  id: string;
  /** Código legible no secuencial (p. ej. `OSIA-XXXX-XXXX`). */
  code: string;
  status: InvitationStatus;
  /** A quién va dirigida, si se generó para un email concreto. */
  email: string | null;
  /** ISO-8601 UTC; `null` si no expira. */
  expiresAt: string | null;
  /** ISO-8601 UTC; `null` si aún no se canjea. */
  acceptedAt: string | null;
  createdAt: string;
};

export type WaitlistEntryDto = {
  id: string;
  email: string;
  status: WaitlistStatus;
  /** De dónde llegó (landing, Discord, referido…). */
  source: string | null;
  /** Invitación generada al promover esta entrada; `null` mientras siga en cola. */
  promotedInvitationId: string | null;
  createdAt: string;
};
