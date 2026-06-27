import { DEFAULT_WORLD_ID } from '@osia/shared';
import type {
  AvatarDto,
  LoginInput,
  ProfileDto,
  SessionDto,
  SignupInput,
  SignupResultDto,
  UpdateAvatarInput,
  UpdateProfileInput,
  VerifyEmailInput,
  WaitlistEntryDto,
  WaitlistInput,
  WorldTicketDto,
} from '@osia/shared';

/** Error tipado del API que el cliente expone (mapea el sobre ApiError). */
export class OsiaApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'OsiaApiError';
  }
}

export type OsiaIdentityClientOptions = {
  /** Base URL de apps/api (p.ej. https://auth.osia.com). */
  apiBaseUrl: string;
  /** fetch inyectable (SSR / tests). Por defecto el global. */
  fetchImpl?: typeof fetch;
};

const ACCESS_SKEW_MS = 30_000; // refrescar 30s antes de expirar

/**
 * Cliente SSO de OSIA (S1.3-H4): habla con apps/api. El refresh token vive en una cookie HttpOnly
 * (no accesible por JS); el access token corto se guarda en memoria. Único acoplamiento entre apps
 * (sin kernel de launcher). Lo consumen apps/web y world-client por igual.
 */
export class OsiaIdentityClient {
  private accessToken: string | null = null;
  private accessExpiresAt = 0;
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly opts: OsiaIdentityClientOptions) {
    this.fetchImpl = opts.fetchImpl ?? fetch.bind(globalThis);
  }

  /** Alta pública e idempotente en la waitlist (no requiere sesión). */
  async joinWaitlist(input: WaitlistInput): Promise<WaitlistEntryDto> {
    const { entry } = await this.request<{ entry: WaitlistEntryDto }>('/v1/waitlist', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return entry;
  }

  /** Registro por invitación (gate server-side). No inicia sesión: requiere verificar email. */
  async signup(input: SignupInput): Promise<SignupResultDto> {
    return this.request<SignupResultDto>('/v1/auth/signup', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async login(input: LoginInput): Promise<SessionDto> {
    const { session } = await this.request<{ session: SessionDto }>('/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    this.rememberAccess(session.accessToken, session.expiresIn);
    return session;
  }

  /** Verifica el email con el OTP; al confirmar inicia sesión (cookie + access token). */
  async verifyEmail(input: VerifyEmailInput): Promise<SessionDto> {
    const { session } = await this.request<{ session: SessionDto }>('/v1/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    this.rememberAccess(session.accessToken, session.expiresIn);
    return session;
  }

  /** Reenvía el código de verificación al email. */
  async resendVerification(email: string): Promise<void> {
    await this.request<void>('/v1/auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  /** Lee la sesión (pasaporte + access token) desde la cookie de refresh; rota la cookie. */
  async getSession(): Promise<SessionDto> {
    const session = await this.request<SessionDto>('/v1/auth/session', { method: 'GET' });
    this.rememberAccess(session.accessToken, session.expiresIn);
    return session;
  }

  async refresh(): Promise<void> {
    const r = await this.request<{ accessToken: string; expiresIn: number }>('/v1/auth/refresh', {
      method: 'POST',
    });
    this.rememberAccess(r.accessToken, r.expiresIn);
  }

  async logout(): Promise<void> {
    await this.request<void>('/v1/auth/logout', { method: 'POST' });
    this.accessToken = null;
    this.accessExpiresAt = 0;
  }

  /** Perfil propio (vista privada). Requiere sesión. */
  async getMyProfile(): Promise<ProfileDto> {
    const token = await this.ensureAccessToken();
    const { profile } = await this.request<{ profile: ProfileDto }>('/v1/profiles/me', {
      method: 'GET',
      headers: { authorization: `Bearer ${token}` },
    });
    return profile;
  }

  /** Edita el perfil propio (parcial). */
  async updateMyProfile(patch: UpdateProfileInput): Promise<ProfileDto> {
    const token = await this.ensureAccessToken();
    const { profile } = await this.request<{ profile: ProfileDto }>('/v1/profiles/me', {
      method: 'PATCH',
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify(patch),
    });
    return profile;
  }

  /** Avatar activo propio. Requiere sesión. */
  async getMyAvatar(): Promise<AvatarDto> {
    const token = await this.ensureAccessToken();
    const { avatar } = await this.request<{ avatar: AvatarDto }>('/v1/avatars/me', {
      method: 'GET',
      headers: { authorization: `Bearer ${token}` },
    });
    return avatar;
  }

  /** Edita la config del avatar activo (parcial). */
  async updateMyAvatar(patch: UpdateAvatarInput): Promise<AvatarDto> {
    const token = await this.ensureAccessToken();
    const { avatar } = await this.request<{ avatar: AvatarDto }>('/v1/avatars/me', {
      method: 'PATCH',
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify(patch),
    });
    return avatar;
  }

  /** Pide un world ticket (S1.3-H5) para entrar al Mundo; usa el access token vigente. */
  async requestWorldTicket(worldId: string = DEFAULT_WORLD_ID): Promise<WorldTicketDto> {
    const token = await this.ensureAccessToken();
    return this.request<WorldTicketDto>('/v1/world/tickets', {
      method: 'POST',
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({ worldId }),
    });
  }

  /** Pide por email el LINK de borrado de cuenta (24 h, un solo uso). Requiere sesión (tu cuenta). */
  async requestAccountDeletion(): Promise<void> {
    const token = await this.ensureAccessToken();
    await this.request<void>('/v1/accounts/me/deletion-request', {
      method: 'POST',
      headers: { authorization: `Bearer ${token}` },
    });
  }

  /** Confirma el borrado con el token del link de email. PÚBLICO: el token es la prueba (sin sesión). */
  async confirmAccountDeletion(token: string): Promise<void> {
    await this.request<void>('/v1/accounts/deletion/confirm', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  }

  /** Snapshot del access token vigente (o `null`). */
  get currentAccessToken(): string | null {
    return this.accessToken;
  }

  // --- internos ---
  private rememberAccess(token: string, expiresIn: number): void {
    this.accessToken = token;
    this.accessExpiresAt = nowMs() + expiresIn * 1000;
  }

  private async ensureAccessToken(): Promise<string> {
    if (!this.accessToken || nowMs() > this.accessExpiresAt - ACCESS_SKEW_MS) {
      await this.getSession(); // refresca silenciosamente vía cookie
    }
    if (!this.accessToken) throw new OsiaApiError(401, 'UNAUTHENTICATED', 'Sin sesión activa.');
    return this.accessToken;
  }

  private async request<T>(path: string, init: RequestInit): Promise<T> {
    const res = await this.fetchImpl(`${this.opts.apiBaseUrl}${path}`, {
      credentials: 'include', // envía/recibe la cookie de refresh del SSO
      ...init,
      headers: { 'content-type': 'application/json', ...init.headers },
    });
    if (!res.ok) {
      const body: unknown = await res.json().catch(() => null);
      const err = extractApiError(body);
      throw new OsiaApiError(res.status, err.code, err.message);
    }
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }
}

function nowMs(): number {
  return Date.now();
}

function extractApiError(body: unknown): { code: string; message: string } {
  if (
    typeof body === 'object' &&
    body !== null &&
    'error' in body &&
    typeof (body as { error: unknown }).error === 'object'
  ) {
    const e = (body as { error: { code?: string; message?: string } }).error;
    return { code: e.code ?? 'INTERNAL_ERROR', message: e.message ?? 'Error.' };
  }
  return { code: 'INTERNAL_ERROR', message: 'Error de red.' };
}
