import type { InvitationStatus } from '@osia/shared';

export const INVITATION_REPOSITORY = Symbol('INVITATION_REPOSITORY');

export type InvitationRecord = {
  code: string;
  status: InvitationStatus;
  inviterAccountId: string | null;
  expiresAt: Date | null;
};

export interface InvitationRepository {
  findByCode(code: string): Promise<InvitationRecord | null>;
}
