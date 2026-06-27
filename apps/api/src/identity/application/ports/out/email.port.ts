export const EMAIL_PORT = Symbol('EMAIL_PORT');

/** Envío de emails transaccionales (transporte abstraído: SMTP en prod, log en dev). */
export interface EmailPort {
  /** Envía el link de borrado de cuenta (válido 24 h, un solo uso) al email del residente. */
  sendAccountDeletionLink(to: string, link: string): Promise<void>;
}
