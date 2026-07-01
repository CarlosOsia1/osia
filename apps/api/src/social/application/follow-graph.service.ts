import { Inject, Injectable } from '@nestjs/common';
import {
  clampLimit,
  decodeCursor,
  ErrorCode,
  type Cursor,
  type FollowRequestDto,
  type ListQueryInput,
  type Page,
  type ProfileBrief,
} from '@osia/shared';
import { AppException } from '../../common/app-exception';
import { FOLLOW_REPOSITORY, type FollowRepository } from './ports/out/follow.repository';

/**
 * Listas del grafo (S3.2-H2): followers / following por handle, paginadas por cursor keyset (no
 * offset). Resuelve el handle a `account_id` (404 si no existe) y delega la consulta en el repo.
 */
@Injectable()
export class FollowGraphService {
  constructor(@Inject(FOLLOW_REPOSITORY) private readonly follows: FollowRepository) {}

  async listFollowers(
    handle: string,
    viewerAccountId: string,
    query: ListQueryInput,
  ): Promise<Page<ProfileBrief>> {
    const accountId = await this.resolveHandle(handle);
    if (!(await this.canViewGraph(accountId, viewerAccountId))) return this.emptyPage(query);
    return this.follows.listFollowers(accountId, clampLimit(query.limit), this.cursor(query.cursor));
  }

  async listFollowing(
    handle: string,
    viewerAccountId: string,
    query: ListQueryInput,
  ): Promise<Page<ProfileBrief>> {
    const accountId = await this.resolveHandle(handle);
    if (!(await this.canViewGraph(accountId, viewerAccountId))) return this.emptyPage(query);
    return this.follows.listFollowing(accountId, clampLimit(query.limit), this.cursor(query.cursor));
  }

  /** Gating de privado (S3.8): las listas de una cuenta privada solo se ven si eres el dueño o su seguidor. */
  private async canViewGraph(targetAccountId: string, viewerAccountId: string): Promise<boolean> {
    if (targetAccountId === viewerAccountId) return true;
    if (!(await this.follows.isAccountPrivate(targetAccountId))) return true;
    return this.follows.isActiveFollower(viewerAccountId, targetAccountId);
  }

  private emptyPage(query: ListQueryInput): Page<ProfileBrief> {
    return { data: [], page: { nextCursor: null, hasMore: false, limit: clampLimit(query.limit) } };
  }

  /** Solicitudes ENTRANTES pendientes hacia el propio usuario (S3.9). Por accountId autenticado (no handle). */
  listMyRequests(accountId: string, query: ListQueryInput): Promise<Page<FollowRequestDto>> {
    return this.follows.listPendingRequests(accountId, clampLimit(query.limit), this.cursor(query.cursor));
  }

  private async resolveHandle(handle: string): Promise<string> {
    const accountId = await this.follows.accountIdByHandle(handle);
    if (!accountId) throw new AppException(ErrorCode.NOT_FOUND, 404, 'Perfil no encontrado.');
    return accountId;
  }

  /** Cursor opaco → keyset; `null` si no viene o está malformado (no lanza: input de cliente). */
  private cursor(opaque: string | undefined): Cursor | null {
    return opaque ? decodeCursor(opaque) : null;
  }
}
