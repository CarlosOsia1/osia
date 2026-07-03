import { Inject, Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { ErrorCode, SESSION_MAX_AGE_MS, type SessionDto } from '@osia/shared';
import { AppException } from '../../common/app-exception';
import { TX_RUNNER, type TxRunner } from '../../common/tx';
import { AUTH_SESSION_PORT, type AuthSessionPort } from './ports/out/auth-session.port';
import { ACCOUNT_REPOSITORY, type AccountRepository } from './ports/out/account.repository';
import { SESSION_STORE, type SessionStore } from './ports/out/session-store.port';
import { SessionExpiredError } from './errors';

/** Refresca el access cacheado esta antelación ANTES de que expire (evita servir un token casi vencido). */
const REFRESH_SKEW_MS = 30_000;

/** Datos crudos de una sesión resuelta (sin el pasaporte, que se arma fuera de la tx). */
type ResolvedTokens = { accountId: string; accessToken: string; accessExpiresAt: Date };

/**
 * Sesión SSO server-side (Ola 1F). La cookie es un ID OPACO; aquí vive la sesión de Supabase.
 * - `start`: tras login/verify/reset, guarda la sesión y devuelve el token de cookie.
 * - `resolve`: si el access cacheado sigue vigente lo devuelve SIN tocar Supabase (mata la carrera); si
 *   está por vencer, refresca SERVER-SIDE con `FOR UPDATE` (single-flight: concurrentes se serializan y
 *   solo uno rota el refresh de Supabase). Reconstruye el pasaporte fuera de la tx (lock corto).
 * - `destroy`: borra la sesión (revocación REAL) y revoca en Supabase best-effort.
 * El token de cookie NUNCA se guarda: en la tabla vive su sha256 (fuga de tabla ≠ robo de sesión).
 */
@Injectable()
export class ServerSessionService {
  constructor(
    @Inject(SESSION_STORE) private readonly store: SessionStore,
    @Inject(AUTH_SESSION_PORT) private readonly sessions: AuthSessionPort,
    @Inject(ACCOUNT_REPOSITORY) private readonly accounts: AccountRepository,
    @Inject(TX_RUNNER) private readonly tx: TxRunner,
  ) {}

  /** Crea la sesión server-side y devuelve el token OPACO que va en la cookie httpOnly. */
  async start(
    accountId: string,
    accessToken: string,
    refreshToken: string,
    accessExpiresInSeconds: number,
  ): Promise<string> {
    const token = randomBytes(32).toString('hex');
    const now = Date.now();
    await this.store.create({
      id: hashToken(token),
      accountId,
      accessToken,
      refreshToken,
      accessExpiresAt: new Date(now + accessExpiresInSeconds * 1000),
      expiresAt: new Date(now + SESSION_MAX_AGE_MS),
    });
    return token;
  }

  /** Resuelve la cookie a una sesión (access vigente + pasaporte). 401 si no existe/expiró. */
  async resolve(token: string): Promise<SessionDto> {
    const id = hashToken(token);
    const existing = await this.store.findById(id);
    if (!existing) throw new AppException(ErrorCode.UNAUTHENTICATED, 401, 'No hay sesión activa.');
    if (existing.expiresAt.getTime() <= Date.now()) {
      await this.store.deleteById(id);
      throw new AppException(ErrorCode.SESSION_EXPIRED, 401, 'Tu sesión expiró.');
    }

    // Fast path: el access cacheado sigue vigente → sin llamar a Supabase (elimina la carrera de refresh).
    if (existing.accessExpiresAt.getTime() - Date.now() > REFRESH_SKEW_MS) {
      return this.buildSession({
        accountId: existing.accountId,
        accessToken: existing.accessToken,
        accessExpiresAt: existing.accessExpiresAt,
      });
    }

    // Slow path: refresco single-flight. `FOR UPDATE` serializa concurrentes (incluso multi-instancia).
    let resolved: ResolvedTokens;
    try {
      resolved = await this.tx.run(async (tx) => {
        const locked = await this.store.findByIdForUpdate(tx, id);
        if (!locked) throw new AppException(ErrorCode.UNAUTHENTICATED, 401, 'No hay sesión activa.');
        // Doble-check: otro request pudo refrescar mientras esperábamos el lock.
        if (locked.accessExpiresAt.getTime() - Date.now() > REFRESH_SKEW_MS) {
          return { accountId: locked.accountId, accessToken: locked.accessToken, accessExpiresAt: locked.accessExpiresAt };
        }
        const auth = await this.sessions.refresh(locked.refreshToken); // rota el refresh; lanza SessionExpired
        const accessExpiresAt = new Date(Date.now() + auth.expiresIn * 1000);
        await this.store.updateTokens(tx, id, auth.accessToken, auth.refreshToken, accessExpiresAt);
        return { accountId: auth.accountId, accessToken: auth.accessToken, accessExpiresAt };
      });
    } catch (e) {
      if (e instanceof SessionExpiredError) {
        await this.store.deleteById(id); // el refresh murió en el proveedor → limpia la sesión muerta
        throw new AppException(ErrorCode.SESSION_EXPIRED, 401, 'Tu sesión expiró.');
      }
      throw e;
    }
    return this.buildSession(resolved);
  }

  /** Cierra la sesión: borra la fila (revocación real) y revoca en Supabase best-effort. */
  async destroy(token: string): Promise<void> {
    const refreshToken = await this.store.deleteById(hashToken(token));
    if (refreshToken) await this.sessions.signOut(refreshToken).catch(() => undefined);
  }

  /** Revoca TODAS las sesiones server-side de una cuenta (reset de contraseña: expulsa otros dispositivos). */
  async revokeAllForAccount(accountId: string): Promise<void> {
    await this.store.deleteByAccount(accountId);
  }

  private async buildSession(t: ResolvedTokens): Promise<SessionDto> {
    const passport = await this.accounts.getPassport(t.accountId);
    if (!passport) throw new AppException(ErrorCode.INTERNAL_ERROR, 500, 'Pasaporte no encontrado.');
    const expiresIn = Math.max(1, Math.floor((t.accessExpiresAt.getTime() - Date.now()) / 1000));
    return { accessToken: t.accessToken, expiresIn, passport };
  }
}

/** sha256 hex del token de cookie: lo que se guarda como `id`, para que una fuga de tabla no sea robo. */
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
