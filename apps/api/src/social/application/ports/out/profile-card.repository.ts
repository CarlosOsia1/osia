export const PROFILE_CARD_REPOSITORY = Symbol('PROFILE_CARD_REPOSITORY');

/** Parche de la tarjeta social propia. Ausente = sin cambio; `null` en URLs = limpiar (respaldo al avatar). */
export interface ProfileCardPatch {
  isPrivate?: boolean;
  photoUrl?: string | null;
  coverUrl?: string | null;
}

/** Puerto de escritura de `social.profile_cards` (S3.8): privacidad + foto/portada. */
export interface ProfileCardRepository {
  /** Crea o actualiza (upsert) la tarjeta del residente con los campos presentes en `patch`. */
  upsert(accountId: string, patch: ProfileCardPatch): Promise<void>;
}
