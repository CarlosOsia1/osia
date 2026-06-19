# Backlog de Sprints — Fase 1: Identidad + Vestíbulo

> Propósito: Detallar el backlog ejecutable (sprints, historias de usuario, criterios de aceptación, tareas técnicas) de la Fase 1 de OSIA — cuentas persistentes, identidad/pasaporte compartido (SSO), perfil + avatar, landing + waitlist + invitaciones (invite-only) y EL VESTÍBULO delgado (pasaporte + 1 puerta a El Mundo). | Estado: Borrador v1 | Fecha: 2026-06-19 | Parte del paquete de diseño OSIA.

Documentos relacionados: ver [Visión y Alcance](../00-vision-alcance.md), [Pilares y Experiencia](../01-pilares-experiencia.md), [Marca y Design System](../02-marca-design-system.md), [Arquitectura del Sistema](../03-arquitectura-sistema.md), [Modelo de Datos (ER)](../04-modelo-datos-er.md), [Tiempo Real y Networking](../05-realtime-mundo-networking.md), [Seguridad, Infra y Costos](../09-seguridad-infra-costos.md), [Contratos de API y Eventos](../10-contratos-api-eventos.md), [Glosario de Dominio](../11-glosario-dominio.md).

---

## 1. Objetivo de la Fase

Convertir la demo de Fase 0 (El Mundo anónimo y efímero) en un **ecosistema con identidad persistente y por invitación**. Al terminar la Fase 1, OSIA deja de ser una "demo" y se vuelve un producto con puerta de entrada de lujo:

- **Cuentas persistentes** con email verificado (Supabase Auth + `apps/api` NestJS hexagonal).
- **Pasaporte compartido (SSO)** que viaja entre apps vía `packages/identity` y cookie de dominio padre `.osia.com`.
- **Perfil + Avatar propios** que persisten y se reflejan en El Mundo (nameplate, apariencia).
- **GTM comunidad-primero**: landing de lujo + captura de `WaitlistEntry` + **sistema de invitaciones (códigos)** + **gate invite-only** server-side.
- **EL VESTÍBULO delgado**: landing/pasaporte celeste minimal + **1 puerta** (El Mundo) con deep-link autenticado. **NO** es un launcher ni una grilla de iconos.
- **Design System OSIA aplicado**: `packages/ui` con tokens, Italiana/Jost, dark-first, componentes mínimos (PassportCard, ExperienceThreshold, ThresholdTransition, WaitlistForm, InvitationCard, code-input de verificación).

El North Star de Fase 0 ("uy, yo me quedo acá") sigue vigente; la Fase 1 añade la capa de **retorno emocional con identidad**: el residente vuelve, su pasaporte lo recuerda, y cruza el umbral hacia El Mundo como suyo.

### Principio rector de la fase

> El Vestíbulo nace **delgado**: pasaporte + una sola puerta. Toda la arquitectura (SSO, catálogo declarativo de experiencias, contrato de módulo) se construye **barata y modular desde el día 1**, pero la amplitud **emerge** — no se construye de golpe. Depth-first.

---

## 2. Definition of Done de la FASE

La Fase 1 está terminada cuando **todos** estos criterios se cumplen y son demostrables end-to-end en staging (`*.osia.localhost` en local, subdominios reales en staging):

| # | Criterio de DoD de Fase | Verificación |
|---|---|---|
| F1-DoD-1 | Un Visitante puede llegar a la landing de lujo, leer el copy de marca y unirse a la **waitlist** (`WaitlistEntry` persistido). | Demo manual + fila en `identity.waitlist_entries`. |
| F1-DoD-2 | Un Visitante con **código de invitación válido** puede registrarse; sin invitación válida **no** puede (gate server-side). | Test e2e: signup con/sin código. |
| F1-DoD-3 | El registro exige **verificación de email** (code-input 6 celdas); sin email verificado no se entra al Mundo ni se opera. | Test e2e + RLS/handshake. |
| F1-DoD-4 | Al verificar, se crean automáticamente `Profile` + `Avatar` por defecto (trigger `handle_new_auth_user` + caso de uso). | Filas en `identity.profiles`/`identity.avatars`. |
| F1-DoD-5 | El **pasaporte (SSO)** funciona: cookie de refresh `Domain=.osia.com` HttpOnly/Secure/SameSite=Lax + access JWT corto; `GET /v1/auth/session` devuelve `Passport`. | Postman + `packages/identity` `useOsiaSession()`. |
| F1-DoD-6 | Un Residente puede **ver y editar su perfil** (handle, display name, bio, accent color dentro de paleta) y editar su **avatar low-poly** (selección de opciones), y todo **persiste**. | CRUD `/v1/profiles/me`, `/v1/avatars`. |
| F1-DoD-7 | El **Vestíbulo** muestra el `PassportCard` + **una** `ExperienceThreshold` (El Mundo) renderizada desde el catálogo declarativo `packages/shared/experiences.ts`; cruzar la puerta hace `ThresholdTransition` cinematográfica + deep-link autenticado a `world-client`. | Demo manual. |
| F1-DoD-8 | `world-client` arranca con **world ticket** (JWT un-solo-uso ~60s emitido por `POST /v1/world/tickets`) verificado por firma en `world-server` **sin tocar DB**; el avatar y nameplate del Residente reflejan su pasaporte. | Handshake WS + nameplate. |
| F1-DoD-9 | Design System aplicado: `packages/ui` con `tokens.json` → CSS vars, Italiana/Jost en woff2 subset, dark-first; `apps/web` **sin Three.js** (bundle ≤250KB gzip). | Bundle analyzer + revisión visual. |
| F1-DoD-10 | Seguridad base: RLS deny-all + ownership por `auth.uid()` en tablas de identidad; rate-limit en auth/invite/waitlist (Cloudflare borde + Redis); CORS allowlist; security headers; secrets fuera de bundles. | Revisión + tests. |
| F1-DoD-11 | Observabilidad mínima: logs Pino con `requestId`, Sentry en `web`/`api`, sobre de error `ApiError` consistente. | Revisión de logs + error provocado. |
| F1-DoD-12 | CI/CD: GitHub Actions con cache de Turbo, `supabase db diff` (drift), test de contraste WCAG AA, contract test de `ErrorCode`; deploy independiente por subdominio. | Pipeline verde. |

### Entregable demostrable de la Fase

Un video/recorrido de 3 minutos: **(1)** Visitante llega a `osia.com`, ve la landing de lujo y se une a la waitlist → **(2)** recibe (manualmente, admin) un código de invitación → **(3)** se registra, verifica su email con el code-input ceremonial → **(4)** elige handle + edita su avatar low-poly → **(5)** entra al Vestíbulo, ve su pasaporte celeste y la única puerta (El Mundo) → **(6)** cruza el umbral (transición cinematográfica) y aparece en El Mundo **como él mismo** (nameplate con su nombre, su avatar). Cierra sesión, vuelve mañana, su pasaporte lo recuerda.

---

## 3. Mapa de Sprints

Cada sprint dimensionado para **un dev solo (Carlos)**, ~1–2 semanas, con foco fragmentado (busca empleo). Orden por dependencias: primero los cimientos (monorepo, contratos, DS, DB), luego identidad/SSO, luego perfil/avatar, luego el Vestíbulo y el handoff a El Mundo, y cierre con hardening/observabilidad/CI.

| Sprint | Título | Duración | Depende de |
|---|---|---|---|
| **OSIA-S1.1** | Cimientos: monorepo, `packages/shared`, `packages/ui` (tokens + tipografías) | 2 sem | Fase 0 (scaffold base si existe) |
| **OSIA-S1.2** | Datos de Identidad: migraciones Supabase + RLS + sync auth | 1 sem | S1.1 |
| **OSIA-S1.3** | Auth & SSO: `apps/api` (contexto identity) + `packages/identity` | 2 sem | S1.1, S1.2 |
| **OSIA-S1.4** | GTM: Landing de lujo + Waitlist + Invitaciones (gate invite-only) | 1–2 sem | S1.2, S1.3 |
| **OSIA-S1.5** | Verificación de email + onboarding (≤3 pasos) + creación de Perfil/Avatar | 1–2 sem | S1.3 |
| **OSIA-S1.6** | Pasaporte: Perfil (ver/editar) + Editor de Avatar low-poly + Settings | 2 sem | S1.5 |
| **OSIA-S1.7** | EL VESTÍBULO delgado: PassportCard + 1 Puerta + ThresholdTransition + deep-link | 1–2 sem | S1.6 |
| **OSIA-S1.8** | Handoff a El Mundo: world ticket + identidad en `world-client` (nameplate/avatar) | 1–2 sem | S1.7, Fase 0 world-server |
| **OSIA-S1.9** | Hardening, Observabilidad y CI/CD de cierre de fase | 1 sem | todos |

Total estimado: **~12–15 semanas** de trabajo efectivo de un dev solo con foco fragmentado.

---

## OSIA-S1.1 — Cimientos: monorepo, `packages/shared`, `packages/ui`

**Objetivo:** Tener el monorepo modular operativo y los dos paquetes que TODO lo demás consume: `packages/shared` (contratos/tipos/enums/errores) y `packages/ui` (design system con tokens y tipografías de marca). Sin esto, ninguna app puede compartir lenguaje ni verse OSIA.

**Duración estimada:** 2 semanas.
**Dependencias:** Scaffold base de Fase 0 (si existe `apps/world-client`/`apps/world-server`); si no, este sprint crea la raíz.

### Historias

#### OSIA-S1.1-H1 — Como Dev/Operador quiero un monorepo pnpm + Turborepo configurado para desarrollar apps independientes con paquetes compartidos.

**Criterios de aceptación**
- Dado el repo `d:/Workspace/OSIA`, Cuando ejecuto `pnpm install` y `pnpm turbo build`, Entonces compilan `packages/shared`, `packages/ui` y `apps/web` sin errores.
- El layout sigue la constitución: `apps/{web,world-client,world-server,api}`, `packages/{identity,shared,atmosphere,ui,assets}`, `docs`, `infra`.
- `turbo.json` define pipelines `build`/`lint`/`test`/`typecheck` con cache; `tsconfig.base.json` compartido; `.env.example` documentado.
- `pnpm-workspace.yaml` registra `apps/*` y `packages/*`.

**Tareas técnicas**
- [ ] Crear `pnpm-workspace.yaml`, `package.json` raíz, `turbo.json`, `tsconfig.base.json`, `.editorconfig`, `.gitignore`.
- [ ] Configurar ESLint + Prettier + `@osia/*` paths; reglas de import boundaries (apps no importan entre sí).
- [ ] Crear `.env.example` con claves de Supabase, Redis, JWT secret, dominios.
- [ ] Scaffold `apps/web` (Next.js App Router + TS), `packages/shared`, `packages/ui` (build con tsup/vite).
- [ ] `docker-compose.dev.yml` con Postgres + Redis para dev local (coordinar con doc 03).
- [ ] Script `pnpm dev` que levante `apps/web` + dependencias.

**DoD:** `pnpm turbo build lint typecheck` verde en local y en CI básico; README de arranque en `docs` o raíz.

---

#### OSIA-S1.1-H2 — Como Dev quiero `packages/shared` como única fuente de verdad de contratos, enums y errores para que cliente y servidor no diverjan.

**Criterios de aceptación**
- Existe la estructura `rest/{dto,pagination,errors}`, `net/{opcodes,messages,entities,codec}`, `domain/{enums,ids}`, `schemas/`, `catalog/{events,experiences}` (ver doc 10).
- `ApiError` (code/message/status/requestId/details/retryable) y `ErrorCode` (enum SCREAMING_SNAKE) definidos.
- `Page<T>` + `Cursor` (keyset) definidos.
- Enums de dominio espejo de los CHECK del ER (al menos: `InstanceKind` HUB/ZONE/PLOT, estados de `Invitation`/`WaitlistEntry`, `accent_color` default champán).
- Validación con **Zod**: un esquema → tipo vía `z.infer` (auth/perfil primero).
- `catalog/experiences.ts` con el catálogo declarativo `{id, nombre, dominio, estado, fase}` — arranca con **una** entrada: El Mundo.

**Tareas técnicas**
- [ ] Crear paquete `@osia/shared` con exports por subcarpeta.
- [ ] Definir `ApiError`, `ErrorCode`, `Page<T>`, `Cursor`.
- [ ] Definir `experiences.ts` (El Mundo: `{ id:'world', nombre:'El Mundo', dominio:'mundo.osia.com', estado:'live', fase:1 }`).
- [ ] Definir enums de dominio (espejo del glosario y de los CHECK del doc 04).
- [ ] Definir Zod schemas iniciales: `SignupInput`, `VerifyEmailInput`, `WaitlistInput`, `RedeemInvitationInput` (placeholders consumidos en S1.3/S1.4).
- [ ] Definir `Passport` (DTO devuelto por `GET /v1/auth/session`).

**DoD:** Paquete publicable interno, importable por `apps/web` y `apps/api`; `ErrorCode` y `experiences` cubiertos por un test de smoke.

---

#### OSIA-S1.1-H3 — Como Residente quiero ver toda la UI con la identidad OSIA (Italiana/Jost, dark-first) para sentir que es un producto de lujo desde el primer pixel.

**Criterios de aceptación**
- Italiana-Regular.ttf y Jost-Variable.ttf convertidos a **.woff2 subset latin** (Jost con eje variable), servidos por `packages/ui` (~60% menos peso).
- `tokens.json` como **single source of truth** + generador (Style Dictionary o script) que emite `color.css`/`typography.css` + exports TS.
- Capa de tokens en 3 niveles (primitivo → semántico → componente); componentes nunca tocan primitivos.
- Dark-first por defecto: `--color-bg = onyx-950`; Marfil es texto/reposo, nunca fondo de trabajo.
- Theme provider que inyecta CSS vars y respeta `prefers-reduced-motion` y preferencia de sonido.
- Contraste AA verificado sobre Onix para cada par texto/fondo (taupe-500 ≥ 4.6:1 como piso).

**Tareas técnicas**
- [ ] Pipeline de fuentes en `packages/assets` (fontTools/subset → woff2) tomando archivos de `brand/fonts`.
- [ ] Crear `packages/ui/src/{tokens,primitives,surfaces,vestibule,hud,sound,theme}` + `tokens.json`.
- [ ] Implementar generador de tokens (primitivos `--osia-onyx-*`, `--osia-champagne-*`, `--osia-ivory-*`, `--osia-taupe-*`, `--osia-stone-*`; semánticos `--color-*`; tipográficos `--font-*`; espaciado `--space-0..10`; radios; elevación; motion `--ease-*`/`--dur-*`).
- [ ] Contrato de atmósfera placeholder (`--atmo-tint/--atmo-glow/--atmo-contrast` con fallback champán) para que el HUD del Mundo lo consuma después.
- [ ] `ThemeProvider` React + `@font-face` con `font-display: swap`.
- [ ] Componentes base mínimos: `Button`, `Card`, `Modal`, `Input` (usados por toda la fase).

**DoD:** Storybook o página `/__styleguide` muestra tokens + 4 componentes base en dark-first; fuentes cargan en woff2; contraste AA validado a mano (automatizado en S1.9).

**Riesgos / notas**
- *Rendimiento:* `apps/web` **no** debe incluir Three.js (doc 08); el engine se carga on-demand al cruzar a El Mundo (S1.8). Mantener bundle ≤250KB gzip.
- *Marca:* champán es escaso y nunca color de estado; estados desaturados/minerales.

---

## OSIA-S1.2 — Datos de Identidad: migraciones Supabase + RLS + sync auth

**Objetivo:** Tener el esquema Postgres de identidad (bootstrap + `identity_core` + world mínimo) con RLS deny-all, ownership por `auth.uid()`, y el trigger que sincroniza `auth.users` → `accounts/profiles/avatars`. La verdad durable de quién es quién.

**Duración estimada:** 1 semana.
**Dependencias:** S1.1.

### Historias

#### OSIA-S1.2-H1 — Como Sistema quiero el bootstrap de DB (extensiones + uuidv7 + helpers) para cimentar todas las tablas.

**Criterios de aceptación**
- Migración `bootstrap` habilita `pgcrypto`, `citext`, `vector`; crea `public.uuidv7()` y `public.set_updated_at()`.
- Convención de nombres de migración `YYYYMMDD__NNNN_<contexto>_<desc>.sql`, forward-only, versionadas en git.
- Seeds idempotentes.

**Tareas técnicas**
- [ ] `supabase init` + estructura `supabase/migrations`.
- [ ] Migración `..__0001_bootstrap_extensions.sql` (extensiones + `uuidv7()` + `set_updated_at()`).
- [ ] Documentar que `uuidv7()` propia se sustituye por nativa cuando Supabase suba a PG18 (cambio de default por migración).

**DoD:** `supabase db reset` aplica limpio en local; `uuidv7()` retorna UUID v7 válido.

---

#### OSIA-S1.2-H2 — Como Sistema quiero las tablas de identidad y world mínimo con sus constraints para persistir cuentas, perfiles, avatares, invitaciones y waitlist.

**Criterios de aceptación**
- Schema `identity`: `accounts`, `profiles`, `avatars`, `email_verifications`, `invitations`, `waitlist_entries`.
- Schema `world` mínimo: `worlds`, `zones`, `world_instances`, `presence_sessions` (para que El Mundo tenga a dónde llegar).
- PK UUID v7; `timestamptz` UTC; soft-delete `deleted_at`; trigger `set_updated_at` en cada tabla.
- `profiles.accent_color` default champán `#CBB89A` (la marca vive en el dato).
- `profiles.handle` `citext` único; `invitations.code` único; `transactions`/cosméticos NO en esta fase.
- Constraints clave de identidad: unicidad de handle, unicidad de código de invitación, FK `<entidad>_id`.

**Tareas técnicas**
- [ ] Migración `..__0002_identity_core.sql` (accounts, profiles, avatars, email_verifications, invitations, waitlist_entries).
- [ ] Migración `..__0003_world_minimal.sql` (worlds, zones, world_instances, presence_sessions).
- [ ] Índices `idx_/uq_/fk_/ck_` por convención del glosario.
- [ ] Seed: 1 `world` ("OSIA"), 1 `zone` hub, 1 `world_instance` hub por defecto.
- [ ] Enum de estados de `invitation` (`pending/redeemed/expired/revoked`) y `waitlist_entry` (`pending/invited/joined`) — espejo en `packages/shared`.

**DoD:** Diagrama ER local coincide con doc 04 para el subconjunto de identidad; filas seed presentes.

---

#### OSIA-S1.2-H3 — Como Residente quiero que mis datos estén protegidos por RLS para que nadie lea/edite lo que no es suyo.

**Criterios de aceptación**
- RLS **deny-all** por defecto en todas las tablas de usuario.
- Política `perfil_propio_rw` (ownership por `auth.uid()`), `profiles` legible por autenticados verificados (para nameplates/handle público acotado).
- `avatars`, `email_verifications`, `invitations` (las propias), `waitlist_entries` con políticas de ownership.
- Trigger `identity.handle_new_auth_user()` on `auth.users` insert que crea `account` + `profile` + `avatar` por defecto y sincroniza `auth.uid() == accounts.id`.
- `service_role` solo server-side; el resto de schemas no expuestos por PostgREST.

**Tareas técnicas**
- [ ] Migración `..__0004_identity_rls.sql` con `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` + policies.
- [ ] Migración `..__0005_auth_sync_trigger.sql` con `handle_new_auth_user()`.
- [ ] Definir roles `anon`, `authenticated`, `service_role`; claim `email_verified` como gate.
- [ ] Tests SQL (pgTAP o script) que validen deny-all y ownership.

**DoD:** Un usuario A no puede `select`/`update` el perfil de B vía PostgREST; al crear un `auth.users` aparece `profile`+`avatar` automáticamente.

**Riesgos / notas**
- *Seguridad:* defense-in-depth (doc 09): RLS + reglas en `apps/api` + autoridad en `world-server`. La RLS es la última línea, no la única.

---

## OSIA-S1.3 — Auth & SSO: `apps/api` (contexto identity) + `packages/identity`

**Objetivo:** El backend hexagonal de identidad y el cliente de pasaporte compartido. Registro, verificación, login, refresh, logout, sesión y world ticket. Sin esto no hay ecosistema (sin SSO no hay nada que une las apps).

**Duración estimada:** 2 semanas.
**Dependencias:** S1.1, S1.2.

### Historias

#### OSIA-S1.3-H1 — Como Dev quiero `apps/api` en NestJS hexagonal con el bounded context `identity` para alojar las reglas de negocio de cuentas.

**Criterios de aceptación**
- Módulo Nest `identity` con `domain/application/infrastructure` y ports `in/out` (espejando `umas-*-service`).
- Adapters (Supabase, Redis) **solo** en `infrastructure`; dominio puro.
- Filtro de excepciones global que emite `ApiError` con `requestId` de Pino.
- Pipe de validación global con Zod (`packages/shared`).
- Paginación por cursor reutilizable (`Page<T>`).
- CORS allowlist (no `*`) y security headers base.

**Tareas técnicas**
- [ ] Scaffold `apps/api` NestJS + Pino + `@nestjs/config` + Doppler/env.
- [ ] Estructura hexagonal del módulo `identity` (ports: `AccountRepository`, `InvitationRepository`, `WaitlistRepository`, `EmailVerificationPort`, `SupabaseAuthAdapter`, `RedisAdapter`).
- [ ] Global exception filter → `ApiError`; interceptor de `requestId`.
- [ ] Zod validation pipe; helper `Page<T>` keyset.
- [ ] Healthcheck `/healthz`; `/metrics` placeholder.

**DoD:** `apps/api` arranca, responde `/healthz`, valida un DTO con Zod y emite `ApiError` en fallo.

---

#### OSIA-S1.3-H2 — Como Invitado quiero registrarme con email + código de invitación para crear mi cuenta OSIA.

**Criterios de aceptación**
- `POST /v1/auth/signup {email, inviteCode}` valida `Invitation` no-usada/no-expirada/no-revocada **server-side** antes de permitir signUp (gate invite-only).
- Sin invitación válida → `403` con `ErrorCode` `INVITE_REQUIRED`/`INVITE_INVALID`.
- Marca `Invitation` como `redeemed` (idempotente, atómico) y emite evento `identity.invitation.redeemed`.
- Dispara verificación de email (Supabase Auth) — sin email verificado no hay acceso al Mundo (claim `email_verified`).
- `password_hash` nullable (delegado a Supabase Auth).

**Tareas técnicas**
- [ ] Caso de uso `RedeemInvitationAndSignup` en `application`.
- [ ] `POST /v1/invitations/redeem` + `POST /v1/auth/signup` (coordinar contrato doc 10).
- [ ] Transacción que redime invitación + crea registro auth (vía `SupabaseAuthAdapter.signUp`).
- [ ] Rate-limit Redis `rl:auth:{ip}:{email}` y `rl:invite:{ip}` (token bucket Lua atómico).
- [ ] Mapear errores Supabase a `ErrorCode`.

**DoD:** signup con código válido crea cuenta y envía email; signup sin código falla con `ApiError` correcto; invitación queda `redeemed`.

---

#### OSIA-S1.3-H3 — Como Residente quiero iniciar sesión y mantener mi sesión (SSO) entre apps para no re-loguearme en cada experiencia.

**Criterios de aceptación**
- `POST /v1/auth/login`, `POST /v1/auth/refresh`, `POST /v1/auth/logout`, `GET /v1/auth/session` (devuelve `Passport`).
- Cookie de **refresh** `Domain=.osia.com`, HttpOnly, Secure, SameSite=Lax, **rotatoria single-use** con **reuse detection** (revoca familia si se reusa).
- **Access JWT corto** (~10min) en memoria, devuelto por `/auth/session` junto al snapshot de pasaporte.
- `apps/web /api/auth/refresh` proxea el refresh token a Supabase.
- Logout global vía revocación de refresh + pub/sub Redis.
- Patrón refresh-y-reintenta en `401 TOKEN_EXPIRED`.

**Tareas técnicas**
- [ ] Endpoints auth en `identity` (login/refresh/logout/session).
- [ ] Implementar rotación + reuse detection (familia de sesiones).
- [ ] `GET /v1/auth/session` → `{ access JWT, Passport }` (perfil, estatus, presencia placeholder).
- [ ] Ruta proxy `apps/web/app/api/auth/refresh`.
- [ ] Canal Redis `auth:logout:{accountId}` para revocación global.

**DoD:** Login en `osia.com` mantiene sesión en `mundo.osia.localhost`; refresh rota cookie; reuse de refresh revoca familia.

---

#### OSIA-S1.3-H4 — Como Dev quiero `packages/identity` (cliente SSO) consumible por todas las apps para que el pasaporte viaje sin acoplar apps.

**Criterios de aceptación**
- `packages/identity` exporta `OsiaIdentityClient`, `useOsiaSession()`, refresh silencioso, snapshot de pasaporte y helper de **deep-link autenticado**.
- Sin kernel de launcher: el único acoplamiento entre apps es este cliente + el Vestíbulo.
- Funciona en `apps/web`, `apps/world-client` (y futuras) sin código duplicado.

**Tareas técnicas**
- [ ] `OsiaIdentityClient` (fetch a `auth.osia.com`, manejo de cookie de dominio padre).
- [ ] Hook `useOsiaSession()` con TanStack Query (cache + refresh silencioso).
- [ ] `requestWorldTicket(worldId)` (consumido en S1.8).
- [ ] Helper `buildDeepLink(experience, params)` con handoff de sesión.

**DoD:** Un componente de prueba en `apps/web` muestra el pasaporte vía `useOsiaSession()`; el mismo hook compila para `world-client`.

---

#### OSIA-S1.3-H5 — Como Residente quiero obtener un world ticket para entrar al Mundo de forma segura sin que el world-server toque la DB en el camino caliente.

**Criterios de aceptación**
- `POST /v1/world/tickets {worldId}` devuelve world ticket JWT (~60s, un-solo-uso, `accountId` + instancia).
- Solo emitido a cuentas con `email_verified`.
- Firmado con clave compartida (o JWKS) verificable por `world-server` por **firma**, sin DB (doc 03/05).

**Tareas técnicas**
- [ ] Caso de uso `IssueWorldTicket` (firma JOSE HS256/EdDSA con secret de servidor).
- [ ] Endpoint `POST /v1/world/tickets`.
- [ ] Rate-limit Redis por cuenta; nonce un-solo-uso en Redis con TTL ~60s.

**DoD:** Ticket emitido para cuenta verificada; `world-server` (S1.8) lo valida por firma; cuenta no verificada recibe `403`.

**Riesgos / notas**
- *Seguridad:* `service_role` y JWT secret solo en servidor, nunca en bundles (doc 09). Toda llamada sensible pasa por `apps/api` como proxy.

---

## OSIA-S1.4 — GTM: Landing de lujo + Waitlist + Invitaciones (gate invite-only)

**Objetivo:** El primer entregable de comunidad-primero: una landing de lujo que captura `WaitlistEntry`, un flujo de invitaciones (códigos) y el panel admin mínimo para promover de waitlist a invitación. FOMO por diseño.

**Duración estimada:** 1–2 semanas.
**Dependencias:** S1.2, S1.3.

### Historias

#### OSIA-S1.4-H1 — Como Visitante quiero una landing de lujo que me transmita "el arte de lo esencial" para querer entrar.

**Criterios de aceptación**
- Landing en `apps/web` (sin Three.js), dark-first, con logo gold-on-dark, Italiana para titulares, Jost para cuerpo, mucho espacio negativo.
- Copy de marca + tagline oficial; motion contenido (fades/slides cortos, nunca bounce); respeta `prefers-reduced-motion`.
- Bundle ≤250KB gzip; LCP rápido; SEO básico (OG con `brand/logos`).
- CTA único y claro: unirse a la waitlist.

**Tareas técnicas**
- [ ] Página `/` en App Router con secciones mínimas (hero, manifiesto breve, CTA waitlist).
- [ ] Usar tokens y componentes de `packages/ui`; favicons 32/64/192/512 de `brand/logos`.
- [ ] Meta OG/Twitter; `next/font` o `@font-face` woff2.
- [ ] Sonido opt-in (ambiente vestíbulo) silencioso hasta primer gesto.

**DoD:** Landing desplegada en Vercel preview, revisión visual aprobada, bundle dentro de presupuesto.

---

#### OSIA-S1.4-H2 — Como Visitante quiero unirme a la waitlist para reservar mi lugar en OSIA.

**Criterios de aceptación**
- `WaitlistForm` captura email (+ opcional handle deseado / cómo llegó).
- `POST /v1/waitlist` persiste `WaitlistEntry` (estado `pending`); idempotente por email.
- Rate-limit de borde (Cloudflare) + Redis (`rl:invite:{ip}` / waitlist).
- Confirmación ceremonial (Modal/Toast OSIA), no un alert genérico.
- Validación Zod compartida cliente+servidor.

**Tareas técnicas**
- [ ] Componente `WaitlistForm` en `packages/ui`.
- [ ] Endpoint `POST /v1/waitlist` (contexto identity).
- [ ] Anti-spam: honeypot + rate-limit; normalización de email (`citext`).
- [ ] Estado de éxito/duplicado/erróneo con `ApiError`.

**DoD:** Email se guarda en `waitlist_entries`; reintento con mismo email no duplica; UI confirma con tono de marca.

---

#### OSIA-S1.4-H3 — Como Dev/Operador (admin) quiero promover entradas de waitlist a invitaciones para abrir la puerta a personas elegidas.

**Criterios de aceptación**
- `GET /v1/admin/waitlist` (paginado cursor) + `POST /v1/admin/waitlist/{id}/promote` que genera un `Invitation` (código único, expiración, cupo).
- Solo accesible a rol `moderator`/admin (claim/role).
- `GET/POST /v1/invitations`, `POST /v1/invitations/{id}/revoke`.
- Cupo escaso de invitaciones por `Account` (~3) como mecánica de escasez (doc 09).
- Evento `identity.invitation.created`.

**Tareas técnicas**
- [ ] Casos de uso `PromoteWaitlist`, `CreateInvitation`, `RevokeInvitation`.
- [ ] Generador de código (legible, no secuencial, p.ej. `OSIA-XXXX-XXXX`).
- [ ] Guard de rol admin/moderator; `AuditLog` de acciones admin.
- [ ] Panel admin mínimo en `apps/web` (`/admin`, protegido) o vía CLI/script si no hay tiempo de UI.

**DoD:** Admin promueve una entrada y obtiene un código; código válido permite signup (S1.3-H2); código revocado falla.

---

#### OSIA-S1.4-H4 — Como Invitado quiero recibir y canjear un código de invitación para entrar al círculo cerrado.

**Criterios de aceptación**
- `InvitationCard` ceremonial muestra el código y un CTA de canje (deep-link `osia.com/join?code=...`).
- El gate invite-only es **server-side** (no se puede saltar desde el cliente).
- Códigos expiran y son un-solo-uso (o cupo definido).

**Tareas técnicas**
- [ ] Componente `InvitationCard` en `packages/ui`.
- [ ] Ruta `/join` que pre-rellena el código y lleva a signup.
- [ ] Validación de expiración/uso en `apps/api`.

**DoD:** Flujo waitlist → promoción → invitación → canje → cuenta, demostrable end-to-end.

**Riesgos / notas**
- *GTM:* la escasez es real (cupo ~3/cuenta); cuarentena suave de cuentas nuevas (límites a la mitad las primeras 24h, doc 09) puede diferirse a S1.9.
- *Legal:* tarea de fondo — verificar colisiones de marca OSIA por clase/territorio antes de abrir más allá del círculo (no bloquea la fase).

---

## OSIA-S1.5 — Verificación de email + onboarding (≤3 pasos) + creación de Perfil/Avatar

**Objetivo:** El onboarding mínimo y ceremonial: verificar email (code-input 6 celdas), crear el pasaporte (handle + avatar por defecto), cruzar. ≤3 pasos, sin tutorial invasivo — la belleza enseña.

**Duración estimada:** 1–2 semanas.
**Dependencias:** S1.3.

### Historias

#### OSIA-S1.5-H1 — Como Invitado quiero verificar mi email con un code-input ceremonial para activar mi cuenta.

**Criterios de aceptación**
- Componente code-input de **6 celdas** (estados: vacío/lleno/error/éxito), con motion contenido y sonido `reveal`/`confirm`.
- `POST /v1/auth/verify-email {token|code}` valida `EmailVerification` y setea claim `email_verified`.
- Sin email verificado: no entra al Mundo ni opera (enforced por RLS + handshake WS).
- Reenvío de código con cooldown (rate-limit).

**Tareas técnicas**
- [ ] Componente `CodeInput` (6 celdas) en `packages/ui`.
- [ ] Endpoint `POST /v1/auth/verify-email`.
- [ ] Página `/verify` en `apps/web` con estados ceremoniales (Modal OSIA).
- [ ] Reenvío con `rl:auth:{ip}:{email}`.

**DoD:** Código correcto verifica y avanza; incorrecto muestra error en personaje de marca; verificado habilita el resto.

---

#### OSIA-S1.5-H2 — Como Sistema quiero crear automáticamente Perfil + Avatar por defecto al verificar para que el pasaporte exista desde el minuto uno.

**Criterios de aceptación**
- Al verificar email, existen `Profile` (handle provisional o pedido) + `Avatar` por defecto (low-poly base, `accent_color` champán).
- Idempotente: re-verificar no duplica.
- El `Profile` se crea vía trigger `handle_new_auth_user` y/o caso de uso `CreateDefaultPassport` (coordinar S1.2-H3).

**Tareas técnicas**
- [ ] Caso de uso `EnsureDefaultPassport` (handle único, colisión → sufijo).
- [ ] Avatar por defecto: set de parámetros low-poly (paleta, primitiva base).
- [ ] Validación de handle (citext único, longitud, charset).

**DoD:** Tras verificar, `profiles`+`avatars` del usuario existen con defaults de marca.

---

#### OSIA-S1.5-H3 — Como Invitado quiero un onboarding de ≤3 pasos (verificar → handle/avatar → cruzar) sin tutorial invasivo para que la belleza me enseñe.

**Criterios de aceptación**
- Flujo: paso 1 verificar email → paso 2 elegir handle + ajustar avatar (mínimo) → paso 3 cruzar el umbral al Mundo.
- Sin pop-ups de tutorial; copy mínimo; el onboarding es parte de la experiencia de lujo.
- Instrumentado: conversión invitación→cuenta, % llega a 1ª sesión.

**Tareas técnicas**
- [ ] Wizard `/onboarding` (3 pasos) en `apps/web` con `ThresholdTransition` al final (preview de S1.7).
- [ ] Eventos de analítica (conversión, drop-off por paso).
- [ ] Guardar progreso (puede salir y volver).

**DoD:** Un Invitado completa onboarding en ≤3 pasos y llega al Vestíbulo; métricas de conversión registradas.

**Riesgos / notas**
- *Privacidad:* sin retención de datos sensibles innecesarios; email es el único PII de la fase.

---

## OSIA-S1.6 — Pasaporte: Perfil (ver/editar) + Editor de Avatar low-poly + Settings

**Objetivo:** El pasaporte editable y persistente. El Residente moldea su identidad (handle, display name, bio, accent color dentro de paleta), su avatar low-poly propio, y sus settings (sonido, movimiento reducido, voz). Todo persiste y viaja entre apps.

**Duración estimada:** 2 semanas.
**Dependencias:** S1.5.

### Historias

#### OSIA-S1.6-H1 — Como Residente quiero ver y editar mi perfil para expresar mi identidad en OSIA.

**Criterios de aceptación**
- `GET/PATCH /v1/profiles/me`, `GET /v1/profiles/{handle}` (vista pública acotada).
- Editable: display name, bio, `accent_color` **dentro de la paleta de marca** (champán/ónix/marfil/taupe/derivados), handle (con cooldown de cambio).
- `ProfileHeader` component (editorial, dark-first).
- Cambios persisten y se reflejan en el pasaporte (`useOsiaSession`).
- Validación Zod; RLS asegura ownership.

**Tareas técnicas**
- [ ] Endpoints `profiles/me` (GET/PATCH) + `profiles/{handle}` (GET).
- [ ] Componente `ProfileHeader` + formulario de edición en `packages/ui`/`apps/web`.
- [ ] Selector de `accent_color` limitado a paleta (no color libre).
- [ ] Invalidación de cache de pasaporte tras edición.

**DoD:** Residente edita perfil, recarga, los cambios persisten; perfil ajeno se ve en modo público sin datos privados.

---

#### OSIA-S1.6-H2 — Como Residente quiero un editor de avatar low-poly propio para tener una apariencia coherente con la marca y bajo control.

**Criterios de aceptación**
- Editor de avatar **low-poly estilizado propio** (decisión recomendada del ADR-000, no Ready Player Me): selección de opciones discretas (forma, paleta dentro de marca, accesorios mínimos).
- `GET /v1/avatars`, CRUD + `activate` (un avatar activo).
- El avatar persiste y se usa en El Mundo (S1.8) y en el nameplate.
- Preview en vivo; sin Three.js pesado en el Vestíbulo (preview ligero o imagen renderizada).

**Tareas técnicas**
- [ ] Definir el modelo de datos del avatar (parámetros discretos serializables en `avatars`).
- [ ] Endpoints `/v1/avatars` (list/create/update/activate).
- [ ] Editor UI con opciones limitadas (coherencia + costo).
- [ ] Preview: opción A (canvas ligero/sprite), opción B (mini-R3F lazy solo en `/passport/avatar`). Mantener landing/Vestíbulo sin engine.
- [ ] Assets CC0 low-poly base (Quaternius/Kenney) en `packages/assets` con manifiesto.

**DoD:** Residente personaliza y activa un avatar; persiste; el mismo avatar aparece en El Mundo (verificable en S1.8).

---

#### OSIA-S1.6-H3 — Como Residente quiero ajustar mis settings (sonido, movimiento reducido, voz/mic) para adaptar la experiencia a mi gusto.

**Criterios de aceptación**
- Settings persistidos en el perfil/preferencias: sonido on/off + volumen, `prefers-reduced-motion` override, opt-in de micrófono (para voz P2P en El Mundo).
- Theme provider y sound engine respetan estas preferencias en todas las apps.
- Permissions-Policy `mic=self` (doc 09).

**Tareas técnicas**
- [ ] Tabla/columnas de preferencias (o JSONB en `profiles`).
- [ ] Endpoint `PATCH /v1/profiles/me` extendido o `/v1/profiles/me/settings`.
- [ ] UI de settings en `apps/web`.
- [ ] Persistencia de preferencia de sonido/motion en cliente + servidor.

**DoD:** Settings persisten entre sesiones y se aplican en el Vestíbulo y (cuando aplique) en El Mundo.

**Riesgos / notas**
- *Rendimiento:* si el preview de avatar usa R3F, debe ser **lazy import** y no contaminar el bundle del Vestíbulo (doc 08, code splitting web vs world-client).

---

## OSIA-S1.7 — EL VESTÍBULO delgado: PassportCard + 1 Puerta + ThresholdTransition

**Objetivo:** El corazón de la fase de cara al usuario: el Vestíbulo celeste minimal. Presenta el pasaporte y **una sola puerta** (El Mundo) renderizada desde el catálogo declarativo, con transición cinematográfica al cruzar. **NO** es un launcher ni una grilla de iconos.

**Duración estimada:** 1–2 semanas.
**Dependencias:** S1.6.

### Historias

#### OSIA-S1.7-H1 — Como Residente quiero ver mi pasaporte celeste al entrar para sentir que el ecosistema me reconoce.

**Criterios de aceptación**
- `PassportCard` muestra: avatar, handle/display name, `accent_color`, estatus/popularidad (placeholder 0 en F1), presencia (placeholder), notificaciones (placeholder), invitaciones restantes.
- Estética de lujo: champán sobre ónix, espacio negativo, motion contenido.
- Datos vienen del pasaporte (`useOsiaSession`), no hardcodeados.

**Tareas técnicas**
- [ ] Componente `PassportCard` en `packages/ui/src/vestibule`.
- [ ] Conectar a `useOsiaSession()`.
- [ ] Estados de carga/skeleton con shimmer de marca.

**DoD:** El Vestíbulo muestra el pasaporte real del Residente logueado.

---

#### OSIA-S1.7-H2 — Como Residente quiero ver las "puertas" a las experiencias (hoy solo El Mundo) sin una grilla de iconos para sentir exclusividad.

**Criterios de aceptación**
- `ExperienceThreshold` (puerta tipo constelación/umbral, **no** icono) renderizada desde `packages/shared/catalog/experiences.ts`.
- En F1 hay **una** puerta: El Mundo (`estado: live`). El sistema soporta N puertas sin cambiar código (aditivo: agregar objeto al catálogo).
- Puertas en estado `coming-soon` (futuras apps) se pueden mostrar atenuadas/sin deep-link (opcional, para FOMO) — no obligatorio en F1.
- `AppSwitcher` discreto (conmutador) presente pero minimal.

**Tareas técnicas**
- [ ] Componentes `ExperienceThreshold`, `AppSwitcher` en `packages/ui/src/vestibule`.
- [ ] Render del catálogo declarativo (map sobre `experiences`).
- [ ] Estilos de puerta: constelación/umbral, no grilla.

**DoD:** Vestíbulo muestra exactamente 1 puerta viva (El Mundo) leída del catálogo; agregar una entrada de prueba al catálogo añade una puerta sin tocar el componente.

---

#### OSIA-S1.7-H3 — Como Residente quiero cruzar el umbral hacia El Mundo con una transición cinematográfica para que el cambio de app se sienta de lujo, no una pestaña que carga.

**Criterios de aceptación**
- `ThresholdTransition` (fade de marca cinematográfico) se ejecuta al cruzar; instrumentada como evento de experiencia.
- Genera un **deep-link autenticado** a `world-client` (`mundo.osia.com`) con handoff de sesión (SSO ya activo → world ticket en S1.8).
- Respeta `prefers-reduced-motion` (transición reducida pero presente).
- Durante la transición se puede **preload** del hub (coordinar doc 08, preload del hub durante el loading de marca).

**Tareas técnicas**
- [ ] Componente `ThresholdTransition` en `packages/ui/src/vestibule`.
- [ ] Orquestación: click puerta → transición → `buildDeepLink('world')` → navegación a `mundo.osia.*`.
- [ ] Evento de analítica `vestibulo.threshold.crossed`.
- [ ] Hook de preload (prefetch hint) opcional.

**DoD:** Cruzar la puerta dispara la transición de marca y navega autenticado a `world-client`; sin re-login.

**Riesgos / notas**
- *Marca:* el cruce Vestíbulo→Mundo es parte de la experiencia de lujo (doc 01). No debe verse como una carga de SPA cualquiera.
- *Anti-alcance:* resistir la tentación de añadir más puertas o un menú de iconos. Una sola puerta. La amplitud emerge.

---

## OSIA-S1.8 — Handoff a El Mundo: world ticket + identidad en `world-client`

**Objetivo:** Cerrar el círculo de identidad: el Residente entra a El Mundo **como él mismo**. El `world-client` pide world ticket, lo presenta al `world-server` (verificado por firma sin DB), y el avatar + nameplate reflejan el pasaporte. El Mundo deja de ser anónimo.

**Duración estimada:** 1–2 semanas.
**Dependencias:** S1.7, Fase 0 (`world-server` con handshake, AOI, tick).

### Historias

#### OSIA-S1.8-H1 — Como Residente quiero entrar a El Mundo con mi identidad para que los demás me reconozcan.

**Criterios de aceptación**
- `world-client` (carga su engine **on-demand**) obtiene world ticket vía `packages/identity.requestWorldTicket('world')`.
- Handshake WSS `HELLO`/`WELCOME` (doc 05) presenta el world ticket; `world-server` verifica firma localmente (JWKS Supabase cacheado / clave compartida) **sin tocar Postgres**.
- Solo cuentas con `email_verified` obtienen ticket (gate ya en S1.3-H5).
- Si el ticket es inválido/expirado → `ERROR` y vuelta al Vestíbulo.

**Tareas técnicas**
- [ ] Integrar `requestWorldTicket` en el arranque de `world-client`.
- [ ] Implementar verificación de firma de world ticket en `world-server` (JOSE, JWKS cacheado / secret compartido) — coordinar doc 03/05.
- [ ] Validación de Origin en upgrade WS; rechazo de ticket reusado (nonce Redis).
- [ ] Manejo de `ERROR`/reconexión hacia el Vestíbulo.

**DoD:** Residente cruza la puerta y aparece en el hub de El Mundo; ticket inválido lo regresa al Vestíbulo con mensaje de marca.

---

#### OSIA-S1.8-H2 — Como Residente quiero que mi avatar y mi nombre se vean en El Mundo para tener presencia identitaria.

**Criterios de aceptación**
- El `world-server` asocia la `PresenceSession` al `accountId` del ticket y difunde `ProfileBrief` (handle, accent, avatar params) a los demás (doc 05/10).
- El HUD del Mundo muestra `Nameplate` con el display name y `accent_color` del pasaporte.
- El avatar low-poly del Residente (de S1.6-H2) se instancia con sus parámetros.
- `presence_sessions` checkpointea apertura/cierre a Postgres; presencia en vivo en Redis con TTL (fan-out doc 04/05).

**Tareas técnicas**
- [ ] Extender `WELCOME`/`ENTITY_JOIN` para portar `ProfileBrief` (coordinar `packages/shared/net`).
- [ ] `world-client`: renderizar `Nameplate` + avatar con params del pasaporte (HUD doc 02).
- [ ] Fan-out de presencia en Redis (`presence:{accountId}` TTL) + checkpoint `presence_sessions`.
- [ ] Reflejar `accent_color` en el HUD vía tokens.

**DoD:** Dos Residentes en el hub se ven con sus nombres y avatares distintos; al salir, la `presence_session` se cierra en Postgres.

**Riesgos / notas**
- *Seguridad:* el `world-server` no debe meter el SDK de Supabase (proceso liviano); solo verifica firma (doc 09).
- *Rendimiento:* avatares cercanos son la "cara social" — se degradan de últimos en el plan de quality tiers (doc 08).
- *Dependencia de Fase 0:* si el `world-server` aún es anónimo, esta historia incluye el cableado de identidad sobre la base de Fase 0.

---

## OSIA-S1.9 — Hardening, Observabilidad y CI/CD de cierre de fase

**Objetivo:** Endurecer y dejar la fase lanzable: rate-limits completos, RLS auditada, security headers, observabilidad (Pino/Sentry), CI/CD con gates de calidad, y subdominios SSO idénticos a prod. Cerrar el DoD de fase.

**Duración estimada:** 1 semana.
**Dependencias:** todos los sprints anteriores.

### Historias

#### OSIA-S1.9-H1 — Como Dev/Operador quiero rate-limit y hardening de borde para resistir abuso con costo casi cero.

**Criterios de aceptación**
- Cloudflare en el borde: WAF managed ruleset, Bot Fight Mode, rate-limit en `/api/auth/*`, proxy naranja (oculta IP de Hetzner).
- Redis rate-limit con semántica de negocio: `rl:auth`, `rl:invite`, `rl:upload`, etc. (NestJS Guard `@RateLimit('auth:login', N, '1h')` vía Lua atómico).
- CORS allowlist (no `*`); security headers en `apps/web` y `apps/api` (HSTS, CSP, nosniff, frame DENY, Referrer-Policy, Permissions-Policy `mic=self`).
- Secrets en Doppler/env, nunca en bundles; redacción de campos sensibles en Pino.

**Tareas técnicas**
- [ ] Configurar Cloudflare (dominio, WAF, rate-limit de borde, R2/CDN para assets futuros).
- [ ] Implementar `RateLimitGuard` Redis + tabla de límites (doc 09).
- [ ] Middleware de security headers + CORS allowlist.
- [ ] Doppler como fuente de secrets, inyección a Vercel + Hetzner.

**DoD:** Login y waitlist tienen límites efectivos; headers presentes (verificado con securityheaders.com o curl); no hay secrets en bundles.

---

#### OSIA-S1.9-H2 — Como Dev quiero observabilidad mínima para diagnosticar problemas en producción.

**Criterios de aceptación**
- Pino con `requestId` correlacionado al `ApiError`.
- Sentry (free) en `apps/web`, `apps/api` (y `world-client`) con source maps.
- `/metrics` placeholder + contadores Redis (conexiones WS, rate-limit hits, errores).
- Alertas mínimas a Discord `#alerts` (error rate, DB>400MB, world-server caído) — webhook.

**Tareas técnicas**
- [ ] Integrar Sentry + source maps en build de Vercel/Docker.
- [ ] Correlación `requestId` Pino ↔ Sentry.
- [ ] Webhook a Discord para alertas críticas.
- [ ] Health-check de Supabase (evitar pausa por inactividad).

**DoD:** Un error provocado aparece en Sentry con `requestId`; alerta de prueba llega a Discord.

---

#### OSIA-S1.9-H3 — Como Dev quiero CI/CD con gates de calidad para no romper la marca ni los contratos.

**Criterios de aceptación**
- GitHub Actions con cache de Turbo; `build`/`lint`/`typecheck`/`test`.
- **Test de contraste WCAG AA** que valide cada par texto/fondo de `tokens.json`.
- **Contract test**: cada `code` emitido por `apps/api` existe en `ErrorCode` de `packages/shared`.
- `supabase db diff` en CI para detectar drift de migraciones.
- Deploy independiente por subdominio en Vercel; Dockerfile de `apps/api`/`world-server`.

**Tareas técnicas**
- [ ] Workflow `ci.yml` (turbo + tests).
- [ ] Test de contraste (script sobre tokens) + test de `ErrorCode`.
- [ ] `supabase db diff` job + convención de nombres de migración.
- [ ] Workflows de deploy por app (Vercel para web/world-client; Hetzner Docker para api/world-server).

**DoD:** Pipeline verde con todos los gates; un PR que rompe contraste o introduce un `code` no registrado **falla** el CI.

---

#### OSIA-S1.9-H4 — Como Dev quiero SSO local idéntico a prod (`*.osia.localhost`) para reproducir el ecosistema de subdominios.

**Criterios de aceptación**
- Entornos local/staging/prod con `*.osia.localhost` (web `osia.localhost`, `mundo.osia.localhost`, `auth.osia.localhost`).
- Cookie de dominio padre funciona idéntica a prod (`.osia.localhost`).
- Logout global vía revocación + pub/sub Redis verificado entre subdominios.

**Tareas técnicas**
- [ ] Config de hosts/dev proxy para `*.osia.localhost`.
- [ ] Ajustar cookie `Domain` por entorno.
- [ ] Test manual: login en web, sesión activa en mundo; logout global cierra ambas.

**DoD:** SSO local reproduce el comportamiento de subdominios de prod; logout global cierra todas las apps.

**Riesgos / notas**
- *Portabilidad:* dejar adapters hexagonales listos para migrar Supabase/Vercel → Hetzner self-host al escalar (mitiga R8 del doc 00). No se ejecuta en F1, solo se garantiza por arquitectura.
- *Costo:* runway de F1 ~$6/mes (solo Hetzner CX22); IA aún apagada (se enciende en Fase 2). Nada se enciende "por si acaso".

---

## 4. Riesgos transversales de la Fase 1

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Sobre-construir el Vestíbulo (caer en launcher/grilla) | Pierde exclusividad de marca; viola decisión bloqueada de Carlos | Disciplina: 1 puerta, catálogo declarativo, revisión contra doc 00/01/03 |
| SSO de subdominios mal configurado (cookies/CORS) | Bloquea todo el ecosistema | S1.9-H4 reproduce prod en local temprano; tests de handoff |
| Foco fragmentado del dev solo (busca empleo) | Sprints se alargan | Sprints lanzables e independientes; cada uno deja algo demostrable |
| Avatar low-poly se vuelve pozo de tiempo | Retrasa la fase | MVP con opciones discretas; preview ligero; assets CC0; sin Three.js en Vestíbulo |
| Gate invite-only saltable desde cliente | Rompe el invite-only | Gate 100% server-side en `apps/api`; RLS + handshake como defensa en profundidad |
| Drift entre migraciones y contratos | Bugs silenciosos | `supabase db diff` + contract test de `ErrorCode` + glosario como fuente de verdad |
| Bundle del Vestíbulo crece con engine 3D | Landing lenta, LCP malo | Code splitting estricto web vs world-client (doc 08); presupuesto ≤250KB gzip |

## 5. Notas de coherencia

- **Lenguaje ubicuo (doc 11):** Pasaporte = `Profile`; Vestíbulo = `apps/web`; Puerta = `ExperienceThreshold`; nunca "launcher/home/grilla". Habitante (no NPC) llega en Fase 2.
- **Depth-first:** esta fase NO construye `apps/social` ni `apps/games`; solo deja el contrato de módulo y el catálogo listos para que se enchufen (la amplitud emerge).
- **Monetización:** nula en F1; cosméticos/economía modelados en el ER pero no implementados (llegan en Fase 4–5).
- **IA:** apagada en F1 (costo ~$0); se enciende en Fase 2 con guardrailes de costo.
- **Lo que SÍ va día 1 (rendimiento, doc 08):** separación web/world-client, KTX2+mipmaps+Meshopt en assets de avatar, dispose disciplinado, niebla — aunque el grueso 3D es de Fase 0/2.
