# Backlog de Sprints — Fase 3: Tejido Social

> Propósito: Plan de ejecución sprint a sprint de La Red Social interna de OSIA (grafo de seguidores, popularidad/reputación, feed, presencia social, notificaciones, perfiles públicos con estatus visible) para un dev solo. | Estado: Borrador v1 | Fecha: 2026-06-19 | Parte del paquete de diseño OSIA.

Cross-links: ver [Visión y Alcance](../00-vision-alcance.md) · [Pilares y Experiencia](../01-pilares-experiencia.md) · [Marca y Design System](../02-marca-design-system.md) · [Arquitectura del Sistema](../03-arquitectura-sistema.md) · [Modelo de Datos (ER)](../04-modelo-datos-er.md) · [Realtime, Mundo y Networking](../05-realtime-mundo-networking.md) · [Habitantes de IA](../07-habitantes-ia.md) · [Seguridad, Infra y Costos](../09-seguridad-infra-costos.md) · [Contratos de API y Eventos](../10-contratos-api-eventos.md) · [Glosario de Dominio](../11-glosario-dominio.md) · [ADR-000](../adr/ADR-000-decisiones-abiertas.md).

---

## 1. Marco de la Fase

### 1.1 Objetivo

Construir **La Red Social** de OSIA como una **app independiente y deep-linkable** (`apps/social` en `social.osia.com`) que se enchufa al **Pasaporte compartido** (SSO de `packages/identity`) y al **Vestíbulo** (`apps/web`) ya existentes de la Fase 1, sin tocar las demás apps. Esta fase hace **visible el estatus**: quién sigue a quién, quién es popular, qué está pasando (feed), quién está online y en qué zona (presencia social), y notifica los eventos sociales relevantes. El **Tejido Social** es el cuarto pilar (Pilar #4) y materializa el **loop social** y parte del **loop de estatus** descritos en [`01-pilares-experiencia.md`](../01-pilares-experiencia.md).

Principio rector: La Red Social NO es un Twitter clónico. Es **editorial, contenido, escasez y atmósfera de lujo** (estética FeedItem del design system). El estatus es **prestigio curado**, nunca métricas de vanidad saturadas. Mantenemos la contención de marca: champán escaso, ónix de fondo, sin semáforo SaaS.

### 1.2 Alcance bloqueado (qué SÍ entra en Fase 3)

| # | Capacidad | Bounded context / app | Entidades |
|---|-----------|----------------------|-----------|
| 1 | App `apps/social` independiente + puerta en el Vestíbulo | `apps/social`, `apps/web`, `packages/shared/catalog/experiences` | — |
| 2 | Grafo de seguidores (seguir/dejar de seguir, listas) | `social` | `Follow` |
| 3 | Popularidad/Reputación visible (derivada, append-only) | `economy` + `social` | `reputation_ledger`, `profiles.popularity_points/reputation`, `PopularityPoints` |
| 4 | Feed: publicar / reaccionar / comentar | `social` | `Post`, `Reaction`, `Comment`, `FeedItem` |
| 5 | Fan-out-on-write a `feed_items` (HASH 8 particiones) | `social` (apps/api) | `feed_items` |
| 6 | Presencia social (quién online + en qué zona/instancia) | `world` (Redis) + `social` (lectura) | `presence_sessions`, claves Redis `presence:{accountId}` |
| 7 | Notificaciones (follow, reacción, comentario, mención) | `social` | `Notification` |
| 8 | Perfiles públicos con estatus visible (PopularityMeter, badges) | `social` + `identity` (lectura) | `Profile`, `Achievement` (lectura) |
| 9 | Contenido social generado por Habitantes IA (chisme en batch barato) | `ai` (job) → `social` | `Inhabitant`, `Post`, `FeedItem` |
| 10 | Tiempo real social opcional (notif/presencia push vía WS o Realtime) | `social` | — |

### 1.3 Anti-alcance (qué NO entra, para no caer en el pozo)

- **NO** mensajería directa / chat privado 1:1 (la voz vive en El Mundo P2P; el DM es Fase 5+ si acaso).
- **NO** grupos/comunidades, hashtags, búsqueda full-text avanzada (solo búsqueda básica de handle).
- **NO** algoritmo de recomendación / ranking de feed por ML. Feed cronológico inverso de a-quién-sigues + posts propios + chisme IA.
- **NO** monetización ni cosméticos comprables aquí (eso es Fase 4/5); la popularidad **no se compra ni se grindea**.
- **NO** moderación con ML pesado; moderación = RLS + rate-limit + reportes manuales + soft-delete.
- **NO** subir media binaria al API: solo **URL prefirmada** a Storage/R2 (el API guarda la URL, ver [`10-contratos`](../10-contratos-api-eventos.md)).
- **NO** tocar `world-server` salvo para **exponer presencia** que ya emite a Redis (la consume `apps/api`).

### 1.4 Definition of Done de la FASE

La Fase 3 está **terminada y lanzable** cuando, para los 2-3 invitados reales (invite-only):

1. **App independiente viva**: `social.osia.com` carga, autentica vía SSO (cookie `.osia.com`, sin re-login), y aparece como una **puerta nueva en el Vestíbulo** sin tocar `apps/world-client`.
2. **Grafo**: un Residente puede seguir / dejar de seguir a otro; ve sus listas de followers/following con conteos correctos; no puede auto-seguirse (`ck_follows_no_self`).
3. **Feed funcional**: un Residente publica un `Post` (texto 1-2000 + hasta 4 URLs), aparece en su feed y en el de sus seguidores (**fan-out-on-write** a `feed_items`); puede reaccionar (PUT idempotente) y comentar; los contadores desnormalizados (`reaction_count`, `comment_count`) son correctos.
4. **Estatus visible**: el perfil público muestra **PopularityMeter** y reputación derivada del `reputation_ledger` append-only (cache en `profiles`), más achievements de Fase 2 (testigo de evento) si existen.
5. **Presencia social**: un Residente ve **quién está online y en qué zona** (lectura de Redis `presence:{accountId}` + checkpoint `presence_sessions`), con dot de presencia (`PresenceDot` del design system).
6. **Notificaciones**: el Residente recibe notificaciones de follow/reacción/comentario/mención, con badge de no-leídas, y puede marcarlas leídas.
7. **Chisme IA**: al menos un Habitante (DJ/locutor de Fase 2) publica **chisme social en batch** (Haiku, costo casi nulo) que aparece atribuido al Habitante en el feed, sin romper presupuesto IA.
8. **Contratos**: todos los endpoints REST viven bajo `/v1` en `auth.osia.com`/`apps/api`, devuelven `ApiError` y `Page<T>` estándar, validan con Zod compartido, y cada `code` emitido existe en `ErrorCode` (contract test verde).
9. **Seguridad**: RLS deny-all + ownership por `auth.uid()` en todas las tablas `social`; rate-limit Redis activo (`rl:post`, `rl:react`, `rl:chat`); solo email-verificados pueden postear/reaccionar.
10. **Rendimiento**: feed paginado por cursor keyset (no offset); el bundle de `apps/social` **no incluye Three.js** (<= 250 KB gzip de shell); migraciones `social` forward-only aplicadas sin drift (`supabase db diff` verde en CI).

### 1.5 Entregable demostrable

Un **video/sesión en vivo de 5 minutos**: Carlos abre `social.osia.com` desde la puerta del Vestíbulo (SSO sin re-login), ve su perfil con su PopularityMeter, sigue a un amigo, publica un post, el amigo lo ve en su feed y reacciona, a Carlos le llega la notificación con badge, ve a su amigo "online en Plaza Crepúsculo" en la lista de presencia, y en el feed aparece una línea de chisme del Habitante DJ. Todo dark-first, editorial, con la estética OSIA.

### 1.6 Mapa de Sprints

| Sprint | Título | Duración | Depende de |
|--------|--------|----------|------------|
| OSIA-S3.1 | Cimientos de La Red Social (app, contexto, schema, contratos) | 1.5 sem | Fase 1 (SSO, Vestíbulo, apps/api), Fase 2 (ai) |
| OSIA-S3.2 | Grafo Social: seguidores y reputación derivada | 1.5 sem | S3.1 |
| OSIA-S3.3 | Feed: publicar, reaccionar, comentar + fan-out-on-write | 2 sem | S3.1, S3.2 |
| OSIA-S3.4 | Presencia social y Notificaciones | 1.5 sem | S3.1, S3.2, S3.3 |
| OSIA-S3.5 | Perfil público con estatus + Vestíbulo + Chisme IA | 1.5 sem | S3.2, S3.3, S3.4 |
| OSIA-S3.6 | Endurecimiento, tiempo real, observabilidad y lanzamiento | 1 sem | Todos |

Total estimado: ~9 semanas para un dev solo (con foco fragmentado, asumir colchón).

---

## OSIA-S3.1 — Cimientos de La Red Social

- **Objetivo**: Levantar el esqueleto de la superficie social como app independiente: scaffold `apps/social`, bounded context `social` en `apps/api` (NestJS hexagonal), schema Postgres `social` con migraciones forward-only, y los contratos (DTOs + Zod + enums + eventos) en `packages/shared`. Nada de feature todavía: el "hola mundo autenticado" que demuestra SSO y el contrato vivo.
- **Duración estimada**: 1.5 semanas.
- **Dependencias**: Fase 1 (cookie SSO `.osia.com`, `packages/identity`, Vestíbulo, `apps/api` con contexto `identity`), Fase 2 (contexto `ai`, presupuesto IA en Redis), `packages/ui`, `packages/shared`.
- **Riesgos**: drift de schema si las migraciones no respetan el orden por contexto; SSO local que no replica subdominios (`*.osia.localhost`). Mitigar con `supabase db diff` en CI y el setup `*.osia.localhost` de Fase 1.

### OSIA-S3.1-H1 — Scaffold de la app independiente `apps/social`

**Como** Dev/Operador **quiero** una app Next.js `apps/social` deep-linkable en su subdominio **para** que La Red Social sea desplegable y accesible por separado, unida al ecosistema solo por el Pasaporte.

**Criterios de aceptación**
- Dado el monorepo pnpm+Turborepo, cuando agrego `apps/social`, entonces `pnpm --filter @osia/social dev` levanta Next.js (App Router, TS) en un puerto local mapeado a `social.osia.localhost`.
- Dado que entro a `social.osia.localhost` con sesión SSO activa, cuando carga la app, entonces `useOsiaSession()` de `packages/identity` resuelve el Pasaporte **sin re-login** (cookie `.osia.com`/`.osia.localhost`).
- Dado que entro **sin** sesión, entonces la app redirige al login del Vestíbulo (`apps/web`) con `returnTo=social.osia.com`.
- El bundle inicial **no** importa Three.js/R3F (verificado por análisis de bundle); shell <= 250 KB gzip.

**Tareas técnicas**
- [ ] Crear `apps/social` con Next.js App Router + TS, `tsconfig` extendiendo `tsconfig.base`.
- [ ] Importar `@osia/identity`, `@osia/ui`, `@osia/shared` como deps de workspace.
- [ ] Integrar `OsiaIdentityClient` + `useOsiaSession()` (refresh silencioso) y guard de ruta que redirige a login si no hay Pasaporte.
- [ ] Configurar TanStack Query (datos server) + Zustand (estado UI local) + provider de tema (`packages/ui` theme provider, `prefers-reduced-motion`).
- [ ] Añadir entrada en `turbo.json` (build/dev/lint) y target de deploy independiente a Vercel (subdominio `social.`).
- [ ] Configurar `social.osia.localhost` en hosts/dev para reproducir SSO de subdominios.
- [ ] Añadir `next-bundle-analyzer` (o `@next/bundle-analyzer`) y assert manual de ausencia de `three`.

**DoD**: La app levanta local y en preview de Vercel, autentica vía SSO sin re-login, redirige correctamente sin sesión, y el shell respeta el presupuesto de bundle.

### OSIA-S3.1-H2 — Bounded context `social` en `apps/api` (hexagonal)

**Como** Dev/Operador **quiero** un módulo Nest `social` con `domain/application/infrastructure` y puertos in/out **para** mantener la arquitectura hexagonal espejo de `umas-*-service` y aislar adapters de Supabase/Redis.

**Criterios de aceptación**
- Dado el patrón hexagonal, cuando creo el módulo `social`, entonces existe la estructura `domain/` (entidades, value objects, puertos), `application/` (casos de uso/services), `infrastructure/` (adapters Supabase, Redis, controllers).
- Los adapters concretos (Supabase, Redis) viven **solo** en `infrastructure`; el dominio no importa SDKs.
- El módulo se registra en `apps/api` y expone rutas bajo `/v1` sin romper los contextos existentes (`identity`, `ai`, `shared-kernel`).

**Tareas técnicas**
- [ ] Crear `apps/api/src/social/` con submódulos `domain`, `application`, `infrastructure`.
- [ ] Definir puertos `out`: `FollowRepositoryPort`, `PostRepositoryPort`, `ReactionRepositoryPort`, `CommentRepositoryPort`, `FeedRepositoryPort`, `NotificationRepositoryPort`, `ReputationLedgerPort`, `PresenceQueryPort`.
- [ ] Definir puertos `in`: casos de uso (se llenan en sprints siguientes; aquí stubs tipados).
- [ ] Adapter Supabase (PostgREST/SQL) en `infrastructure/persistence` reutilizando el cliente `service_role` server-side.
- [ ] Adapter Redis en `infrastructure/cache` (presencia, contadores, invalidación de feed).
- [ ] Registrar `SocialModule` en el `AppModule`; healthcheck `/v1/social/health`.

**DoD**: `nest build` verde, módulo cargado, `/v1/social/health` responde, sin fugas de adapters al dominio (revisado por imports).

### OSIA-S3.1-H3 — Schema Postgres `social` y migraciones forward-only

**Como** Dev/Operador **quiero** el schema `social` con sus tablas, índices, RLS y `feed_items` particionado **para** tener la verdad durable del Tejido Social alineada al ER ([`04-modelo-datos-er.md`](../04-modelo-datos-er.md)).

**Criterios de aceptación**
- Dado el ER, cuando aplico las migraciones, entonces existen las tablas `social.follows`, `social.posts`, `social.reactions`, `social.comments`, `social.feed_items` (HASH 8 particiones), `social.notifications`.
- Toda tabla tiene PK `uuidv7()`, `created_at`/`updated_at timestamptz` UTC, `deleted_at` (soft-delete), trigger `set_updated_at`.
- Constraints presentes: `ck_follows_no_self`, `uq_follows_pair`, `uq_reactions(post_id, account_id, kind)`.
- RLS **deny-all** activo + políticas de ownership por `auth.uid()` y lectura para `authenticated` (email verificado).
- `supabase db diff` no reporta drift en CI.

**Tareas técnicas**
- [ ] Migración `YYYYMMDD__0001_social_follows.sql`: `follows(follower_id, followee_id, created_at, deleted_at)` + `uq_follows_pair`, `ck_follows_no_self`, índices `idx_follows_follower`, `idx_follows_followee`.
- [ ] Migración `..._0002_social_posts.sql`: `posts(id, author_account_id, author_kind('account'|'inhabitant'), body, attachments jsonb, reaction_count int, comment_count int, ...)`.
- [ ] Migración `..._0003_social_reactions.sql`: `reactions(post_id, account_id, kind)` + `uq_reactions`.
- [ ] Migración `..._0004_social_comments.sql`: `comments(post_id, author_account_id, body, ...)`.
- [ ] Migración `..._0005_social_feed_items.sql`: `feed_items` particionado `PARTITION BY HASH(account_id)` en 8 particiones (`feed_items_p0..p7`).
- [ ] Migración `..._0006_social_notifications.sql`: `notifications(account_id, type, actor_account_id, subject_ref, read_at, ...)`.
- [ ] Migración `..._0007_social_rls.sql`: `ENABLE ROW LEVEL SECURITY` + políticas `post_owner_write/update`, `post_read_verificados`, follow/reaction/comment ownership, notif `account_id = auth.uid()`.
- [ ] Triggers `set_updated_at` en cada tabla; seeds idempotentes mínimos.
- [ ] Verificar `supabase db diff` en GitHub Actions.

**DoD**: Migraciones aplicadas forward-only en local y en proyecto Supabase, RLS verificada con tests (un usuario no ve/edita datos de otro salvo lectura pública), CI sin drift.

### OSIA-S3.1-H4 — Contratos `social` en `packages/shared`

**Como** Dev/Operador **quiero** DTOs + esquemas Zod + enums + catálogo de eventos del contexto social en `packages/shared` **para** que cliente y servidor compartan una única fuente de verdad y nunca diverjan.

**Criterios de aceptación**
- Dado `packages/shared`, cuando defino los contratos sociales, entonces existen `rest/dto` (Post, Comment, Reaction, Follow, Notification, ProfileBrief), `schemas/` Zod correspondientes (tipo vía `z.infer`), `domain/enums` (ReactionKind, NotificationType, AuthorKind) espejo de los CHECK del ER, y `catalog/events` con los eventos `social.*`.
- Todo `code` de error usado por el contexto existe en `ErrorCode` (`errors.ts`).
- Paginación: los listados sociales usan `Page<T>` + cursor opaco keyset.

**Tareas técnicas**
- [ ] `rest/dto/social.ts`: `PostDTO`, `CreatePostInput` (body 1-2000, attachments URL max 4), `CommentDTO`, `CreateCommentInput`, `ReactionDTO`, `FollowDTO`, `NotificationDTO`, `ProfileBrief`, `FeedItemDTO`, `PresenceEntryDTO`.
- [ ] `schemas/social.ts`: Zod de cada input, reutilizando `CreatePostInput` ya definido en `contracts/post.ts` (Fase 1) si existe.
- [ ] `domain/enums.ts`: `ReactionKind` (p.ej. `glow|spark|...` dentro de paleta de marca), `NotificationType` (`follow|reaction|comment|mention|gossip`), `AuthorKind` (`account|inhabitant`).
- [ ] `catalog/events.ts`: `social.post.published`, `social.post.reacted`, `social.post.commented`, `social.follow.created`, `social.follow.removed`, `social.notification.created`, `social.gossip.published`.
- [ ] `errors.ts`: añadir `POST_NOT_FOUND`, `ALREADY_FOLLOWING`, `CANNOT_FOLLOW_SELF`, `REACTION_INVALID_KIND`, `RATE_LIMITED`, `EMAIL_NOT_VERIFIED`.
- [ ] Contract test: cada `code` emitido por `social` ∈ `ErrorCode`.

**DoD**: `pnpm --filter @osia/shared build` verde, tipos exportados consumibles por `apps/api` y `apps/social`, contract test de errores verde.

---

## OSIA-S3.2 — Grafo Social: seguidores y reputación derivada

- **Objetivo**: Implementar el grafo de seguidores (seguir/dejar de seguir, listas, conteos) y la **popularidad/reputación** como cache derivado de un `reputation_ledger` append-only (event-sourced). El estatus empieza a existir como dato.
- **Duración estimada**: 1.5 semanas.
- **Dependencias**: OSIA-S3.1.
- **Riesgos**: contadores desnormalizados que se desincronizan (mitigar con triggers + job de reconciliación); reputación grindeable (mitigar: ledger con razones acotadas y pesos, no puntos por acción trivial).

### OSIA-S3.2-H1 — Seguir / dejar de seguir

**Como** Residente **quiero** seguir y dejar de seguir a otros Residentes y Habitantes **para** construir mi red y curar mi feed.

**Criterios de aceptación**
- Dado que veo a otro Residente, cuando pulso "Seguir", entonces se crea un `Follow` y veo el estado "Siguiendo".
- Dado que ya lo sigo, cuando intento seguir de nuevo, entonces el API responde idempotente (no duplica; `uq_follows_pair`) o `ALREADY_FOLLOWING` si aplica.
- Dado que intento seguirme a mí mismo, entonces recibo `CANNOT_FOLLOW_SELF` (400) (respaldado por `ck_follows_no_self`).
- Dejar de seguir hace soft-delete del `Follow`.

**Tareas técnicas**
- [ ] Casos de uso `FollowAccount`, `UnfollowAccount` (application) con puerto `FollowRepositoryPort`.
- [ ] Endpoints: `POST /v1/follows {targetHandle|targetId}`, `DELETE /v1/follows/{targetId}`.
- [ ] Validación Zod + guard de email verificado + rate-limit `rl:follow:{account}` (Redis token bucket vía guard `@RateLimit`).
- [ ] Emitir evento `social.follow.created` / `social.follow.removed` (para notificaciones y contadores).
- [ ] UI `apps/social`: botón Follow/Unfollow con estado optimista (TanStack Query mutation + rollback).

**DoD**: Seguir/dejar de seguir funciona end-to-end, idempotente, con anti-self y rate-limit; estado optimista correcto.

### OSIA-S3.2-H2 — Listas de seguidores y seguidos con conteos

**Como** Residente **quiero** ver mis listas de followers/following y sus conteos **para** entender mi red y la de otros.

**Criterios de aceptación**
- `GET /v1/profiles/{handle}/followers` y `/following` devuelven `Page<ProfileBrief>` por cursor keyset (no offset), con `nextCursor`/`hasMore`.
- Los conteos (`followers_count`, `following_count`) son correctos y consistentes con el grafo.
- Las listas respetan soft-delete (no muestran follows revocados).

**Tareas técnicas**
- [ ] Casos de uso `ListFollowers`, `ListFollowing` con paginación keyset (`created_at, id` como cursor).
- [ ] Contadores desnormalizados `profiles.followers_count/following_count` vía trigger en insert/soft-delete de `follows`, o cache Redis con reconciliación.
- [ ] Endpoints + DTO `ProfileBrief` (handle, displayName, avatar, accentColor, popularity, isFollowing).
- [ ] UI: pestañas Followers/Following con scroll infinito (cursor), estado vacío editorial.

**DoD**: Listas paginadas correctas, conteos consistentes, sin offset, UI con scroll infinito.

### OSIA-S3.2-H3 — Reputación/Popularidad derivada del ledger

**Como** Sistema **quiero** un `reputation_ledger` append-only que alimente `profiles.popularity_points/reputation` **para** que el estatus sea fuente-de-verdad event-sourced, no un número editable.

**Criterios de aceptación**
- Dado un evento social (nuevo follower, reacción recibida, asistencia a evento efímero), cuando se registra, entonces se hace **append** al `reputation_ledger` con `reason` acotada y `delta`, y se recalcula el cache en `profiles`.
- El cache `profiles.popularity_points` nunca se escribe directo desde el cliente; solo el server lo deriva.
- La reputación es **no grindeable**: razones acotadas con pesos y caps (p.ej. máximo N puntos/día por reacciones).

**Tareas técnicas**
- [ ] Migración `economy.reputation_ledger` (si no existe de fase previa): `(id, account_id, reason enum, delta int, source_ref, created_at)` append-only, sin update/delete (revocado por compensación).
- [ ] Enum `ReputationReason` en `packages/shared`: `new_follower`, `reaction_received`, `event_witness`, `gossip_mention`, ... con tabla de pesos.
- [ ] Caso de uso `AppendReputation` + trigger/recalculo que actualiza `profiles.popularity_points/reputation`.
- [ ] Caps anti-grind (Redis contador diario por razón) y `reputation_ledger` como única vía de cambio.
- [ ] Suscribir a eventos `social.follow.created` y `social.post.reacted` para acreditar reputación al **receptor**.

**DoD**: Reputación se mueve solo por el ledger, cache consistente, caps anti-grind activos, recalculo verificado con test.

---

## OSIA-S3.3 — Feed: publicar, reaccionar, comentar + fan-out

- **Objetivo**: El corazón de la Red Social: publicar `Post`, reaccionar (PUT idempotente), comentar, y materializar el feed por **fan-out-on-write** a `feed_items` particionado, con contadores desnormalizados e invalidación de cache en Redis.
- **Duración estimada**: 2 semanas.
- **Dependencias**: OSIA-S3.1, OSIA-S3.2.
- **Riesgos**: fan-out costoso para cuentas con muchos followers (en v1 con 2-3 usuarios es trivial; documentar umbral para fan-out-on-read futuro); contadores desincronizados (triggers + cron de reconciliación + poda de feed).

### OSIA-S3.3-H1 — Publicar un Post (con media por URL prefirmada)

**Como** Residente **quiero** publicar un Post de texto con hasta 4 adjuntos **para** compartir momentos en mi red, dentro de la estética editorial OSIA.

**Criterios de aceptación**
- Dado el editor, cuando publico texto (1-2000 chars) y opcionalmente hasta 4 URLs de media, entonces se crea el `Post` y aparece en mi feed inmediatamente.
- Dado un body vacío o >2000, entonces validación Zod rechaza con `ApiError` (`VALIDATION_ERROR`).
- La media se sube por **URL prefirmada** a Storage/R2; el API solo guarda la URL (nunca recibe el binario).
- Solo cuentas con email verificado pueden postear (RLS + guard).

**Tareas técnicas**
- [ ] Caso de uso `CreatePost` (application) + puerto `PostRepositoryPort`.
- [ ] Endpoint `POST /v1/posts` (Bearer JWT) con `CreatePostInput` Zod (reusar `contracts/post.ts`).
- [ ] Flujo de upload: `POST /v1/media/upload-url` devuelve URL prefirmada (Storage/R2); cliente sube directo; pasa la URL final en attachments.
- [ ] Rate-limit `rl:post:{account}` (Redis); guard de verificación de email.
- [ ] Emitir `social.post.published` (dispara fan-out, ver H4).
- [ ] UI editor `apps/social`: `FeedItem` editorial del design system, contador de caracteres, preview de adjuntos, estado de envío.

**DoD**: Post creado end-to-end con media por URL prefirmada, validación, rate-limit, RLS; aparece en feed propio.

### OSIA-S3.3-H2 — Reaccionar (PUT idempotente)

**Como** Residente **quiero** reaccionar a un Post **para** dar señal social y aportar a la popularidad del autor.

**Criterios de aceptación**
- Dado un Post, cuando reacciono con un `kind`, entonces se hace upsert idempotente (`PUT`, `uq_reactions(post,account,kind)`); reaccionar dos veces igual no duplica.
- Quitar reacción es `DELETE` idempotente.
- `kind` inválido → `REACTION_INVALID_KIND`.
- La reacción incrementa `posts.reaction_count` (trigger) y acredita reputación al autor (vía ledger, S3.2-H3).

**Tareas técnicas**
- [ ] Caso de uso `SetReaction`/`RemoveReaction`.
- [ ] Endpoints `PUT /v1/posts/{id}/reactions {kind}` (idempotente) y `DELETE /v1/posts/{id}/reactions/{kind}`.
- [ ] Trigger de contador `reaction_count` + emit `social.post.reacted` (notif + reputación).
- [ ] Rate-limit `rl:react:{account}`.
- [ ] UI: reacciones dentro de paleta de marca (champán/marfil/taupe), animación de motion canónica (sin bounce), estado optimista.

**DoD**: Reacción PUT/DELETE idempotente, contador correcto, reputación acreditada al autor, kinds dentro de marca.

### OSIA-S3.3-H3 — Comentar

**Como** Residente **quiero** comentar un Post **para** conversar dentro del feed.

**Criterios de aceptación**
- Dado un Post, cuando comento (body 1-1000), entonces se crea `Comment` y se incrementa `comment_count`.
- Listado de comentarios paginado por cursor keyset.
- Soft-delete de comentario propio; autor del post no puede editar comentarios ajenos.

**Tareas técnicas**
- [ ] Caso de uso `CreateComment`, `ListComments`, `DeleteComment`.
- [ ] Endpoints `POST /v1/posts/{id}/comments`, `GET /v1/posts/{id}/comments` (`Page<CommentDTO>`), `DELETE /v1/comments/{id}`.
- [ ] Trigger `comment_count`; emit `social.post.commented` (notif + posible mención).
- [ ] Detección simple de **menciones** `@handle` en el body → resolver a `account_id` para notificación.
- [ ] UI: hilo de comentarios bajo el FeedItem, scroll por cursor.

**DoD**: Comentar/listar/borrar funciona, contador correcto, menciones detectadas para notificación.

### OSIA-S3.3-H4 — Fan-out-on-write a `feed_items` + lectura del feed

**Como** Residente **quiero** un feed con los posts de quienes sigo y los míos **para** ver lo que pasa en mi red en orden cronológico inverso.

**Criterios de aceptación**
- Dado un `Post` publicado, cuando se emite `social.post.published`, entonces se materializan `feed_items` para el autor y para cada follower (fan-out-on-write), distribuidos por `HASH(account_id)` en 8 particiones.
- `GET /v1/feed` devuelve `Page<FeedItemDTO>` cronológico inverso por cursor keyset.
- El feed se invalida/actualiza al publicar, reaccionar (contadores) y al seguir/dejar de seguir.
- Existe un **cron de poda** de `feed_items` viejos (retención) para mantener la DB bajo el límite free.

**Tareas técnicas**
- [ ] Caso de uso `FanOutPost` (consumidor de `social.post.published`): inserta `feed_items` para autor + followers (batch).
- [ ] Caso de uso `GetFeed` con cursor keyset `(created_at, id)` sobre la partición del lector.
- [ ] Invalidación de cache de feed en Redis (key por `account_id`) en publish/follow/unfollow.
- [ ] Endpoint `GET /v1/feed`; DTO `FeedItemDTO` (post + autor brief + counts + viewerReaction).
- [ ] Cron de poda `social.feed_items` (job programado) + métricas de tamaño.
- [ ] Documentar umbral de followers para migrar a fan-out-on-read (v1 no lo necesita).
- [ ] UI: feed infinito con `FeedItem` editorial, skeleton de carga, estado vacío de lujo.

**DoD**: Fan-out correcto a las 8 particiones, feed paginado cronológico inverso, invalidación y poda activas, demostrable con 2 cuentas (publico → el otro lo ve).

---

## OSIA-S3.4 — Presencia social y Notificaciones

- **Objetivo**: Hacer **visible quién está online y en qué zona** (presencia social leída de Redis + checkpoint `presence_sessions`), y entregar **notificaciones** de los eventos sociales (follow/reacción/comentario/mención) con badge de no-leídas.
- **Duración estimada**: 1.5 semanas.
- **Dependencias**: OSIA-S3.1, S3.2, S3.3.
- **Riesgos**: presencia fantasma si TTL/heartbeat fallan (mitigar con TTL en `presence:{accountId}` + checkpoint de apertura/cierre); tormenta de notificaciones (coalescing + rate por tipo).

### OSIA-S3.4-H1 — Presencia social (quién online y dónde)

**Como** Residente **quiero** ver qué amigos están online y en qué zona/instancia **para** saber a quién puedo encontrarme en El Mundo.

**Criterios de aceptación**
- Dado que un amigo está conectado a una instancia del Mundo, cuando consulto presencia, entonces lo veo "online en {Zona}" con su `PresenceDot` verde-mineral.
- La presencia se lee de Redis `presence:{accountId}` (TTL) que el `world-server` ya publica; `apps/api` la expone vía `PresenceQueryPort`.
- Al desconectarse (o expirar TTL), el amigo pasa a offline; checkpoint a `presence_sessions` (apertura/cierre) en Postgres.
- Solo se muestra presencia de cuentas que sigo o que me siguen (privacidad por relación).

**Tareas técnicas**
- [ ] Adapter `PresenceQueryPort` → Redis: leer `presence:{accountId}` (instanceId, zone, lastSeen).
- [ ] Endpoint `GET /v1/presence` → `Page<PresenceEntryDTO>` filtrado por grafo del solicitante.
- [ ] Suscripción al canal Redis Pub/Sub `presence:events` (emitido por world-server, ver [`05-realtime`](../05-realtime-mundo-networking.md)) para push opcional.
- [ ] Checkpoint `presence_sessions` (open al join, close al leave/TTL) — coordinar con world-server (ya existente de Fase 0/1).
- [ ] UI: panel "Quién está despierto" con `Avatar` + `PresenceDot` + zona; estado vacío editorial.

**DoD**: Presencia social correcta (online/offline/zona), filtrada por relación, leída de Redis, con checkpoint durable; demostrable con un amigo entrando/saliendo del Mundo.

### OSIA-S3.4-H2 — Notificaciones sociales

**Como** Residente **quiero** recibir notificaciones de follows, reacciones, comentarios y menciones **para** enterarme de la actividad de mi red.

**Criterios de aceptación**
- Dado un evento social (`social.follow.created`, `social.post.reacted`, `social.post.commented`, mención), cuando ocurre, entonces se crea una `Notification` para el destinatario correcto.
- `GET /v1/notifications` devuelve `Page<NotificationDTO>` con badge de no-leídas (`unreadCount`).
- `POST /v1/notifications/read` (todas) y `POST /v1/notifications/{id}/read` marcan leídas.
- No me notifico a mí mismo (no self-notify); notificaciones similares se **coalescen** (p.ej. "3 personas reaccionaron").

**Tareas técnicas**
- [ ] Caso de uso `CreateNotification` suscrito a los eventos `social.*` (bus de dominio).
- [ ] Coalescing por `(type, subject_ref)` en ventana corta (Redis) antes de persistir.
- [ ] Endpoints `GET /v1/notifications`, `POST /v1/notifications/read`, `POST /v1/notifications/{id}/read`.
- [ ] Contador `unreadCount` en Redis/Postgres; emit `social.notification.created`.
- [ ] UI: campana con badge no-leídas, panel desplegable con `Toast` para llegadas en vivo (si hay tiempo real, ver S3.6).

**DoD**: Notificaciones por los 4 tipos, coalescing, badge y marcar-leído correctos, sin self-notify; demostrable con 2 cuentas.

---

## OSIA-S3.5 — Perfil público con estatus + Vestíbulo + Chisme IA

- **Objetivo**: El **perfil público** que hace el estatus visible (PopularityMeter, badges/achievements, posts del usuario), **enchufar la puerta** de La Red Social al Vestíbulo (catálogo declarativo), y encender el **chisme social generado por Habitantes IA** en batch barato.
- **Duración estimada**: 1.5 semanas.
- **Dependencias**: S3.2, S3.3, S3.4; Fase 2 (`ai`, presupuesto IA, personas).
- **Riesgos**: chisme IA que rompe presupuesto (mitigar: Haiku + Batches API -50% + cap diario + kill-switch ya existente de Fase 2); chisme que rompe la marca (moderación de salida en 4 capas de Fase 2 + boundaries por persona).

### OSIA-S3.5-H1 — Perfil público con estatus visible

**Como** Visitante/Residente **quiero** ver el perfil público de alguien con su popularidad, badges y posts **para** percibir su estatus dentro de OSIA.

**Criterios de aceptación**
- Dado `social.osia.com/{handle}`, cuando cargo, entonces veo `ProfileHeader` (avatar, displayName, accentColor de marca, handle), **PopularityMeter** (de `popularity_points/reputation`), badges de `Achievement` (lectura, p.ej. "Testigo de la lluvia de meteoros" de Fase 2), botón Follow/Unfollow y conteos.
- El perfil muestra los posts del usuario paginados por cursor.
- `accent_color` por defecto champán `#CBB89A`; la marca vive en el dato.
- Perfiles respetan RLS de lectura (solo verificados / públicos).

**Tareas técnicas**
- [ ] Endpoint `GET /v1/profiles/{handle}` (perfil público enriquecido: brief + popularity + achievements + counts + isFollowing) y `GET /v1/profiles/{handle}/posts`.
- [ ] Lectura de `account_achievements`/`achievements` (contexto game/economy, solo lectura) para badges.
- [ ] UI `apps/social`: página de perfil con `ProfileHeader`, `PopularityMeter`, `Leaderboard`/badges minimal, feed del usuario.
- [ ] Implementar `PopularityMeter` en `packages/ui` (estados minerales, sin semáforo, champán escaso).
- [ ] Estado propio (`/me`) editable: bio, accentColor dentro de la paleta de marca (validación de gamut).

**DoD**: Perfil público bello, estatus visible (popularidad + badges + posts), Follow integrado, dentro de la marca; `PopularityMeter` en el design system.

### OSIA-S3.5-H2 — Puerta de La Red Social en el Vestíbulo

**Como** Residente **quiero** una puerta a La Red Social desde el Vestíbulo **para** entrar con deep-link directo, sin grilla de iconos.

**Criterios de aceptación**
- Dado el catálogo declarativo `packages/shared/catalog/experiences.ts`, cuando agrego La Red Social, entonces el Vestíbulo (`apps/web`) renderiza una **puerta nueva** (`ExperienceThreshold`) tipo constelación, **no un icono de grilla**.
- Cruzar la puerta hace deep-link autenticado a `social.osia.com` con handoff de Pasaporte (sin re-login) y `ThresholdTransition` cinematográfica (fade de marca).
- Agregar la puerta es **aditivo**: no toca `apps/world-client` ni otras puertas.

**Tareas técnicas**
- [ ] Añadir entrada `{ id:'social', nombre:'La Red Social', dominio:'social.osia.com', estado:'live', fase:3 }` a `experiences.ts`.
- [ ] Verificar render de `ExperienceThreshold` + `ThresholdTransition` en `apps/web` sin cambios estructurales.
- [ ] Deep-link autenticado: handoff de sesión vía cookie SSO `.osia.com`; `returnTo` correcto.
- [ ] Instrumentar evento de experiencia "cruce de umbral → social".

**DoD**: Puerta visible y cruzable en el Vestíbulo, deep-link con SSO, transición cinematográfica, sin tocar otras apps.

### OSIA-S3.5-H3 — Chisme social generado por Habitantes IA (batch barato)

**Como** Sistema **quiero** que los Habitantes IA publiquen chisme/contenido en batch barato **para** que el feed nunca se sienta vacío con 2-3 usuarios (ataque estructural al cold-start).

**Criterios de aceptación**
- Dado un job programado, cuando corre, entonces genera 1-N líneas de chisme (Haiku) atribuidas a un Habitante (DJ/locutor/narrador de Fase 2) y crea `Post`/`FeedItem` con `author_kind='inhabitant'`.
- El chisme respeta `voice_rules`/`boundaries` de la `InhabitantPersona` y la paleta/tono de marca (moderación de salida de Fase 2).
- El gasto está **acotado**: usa Haiku, candidato a Batches API (-50%), cuenta contra `budget:ai:global:{yyyymm}`, y se degrada a líneas pre-escritas si se cruza el presupuesto (kill-switch existente).
- El chisme aparece en el feed de los seguidores del Habitante (fan-out normal).

**Tareas técnicas**
- [ ] Job async `GenerateGossip` en `apps/api` (contexto `ai`): toma `worldSnapshot` reciente + memorias de Habitante → prompt Haiku → 1-N líneas.
- [ ] Publicar vía el mismo `CreatePost` con `author_account_id` = cuenta de servicio del Habitante, `author_kind='inhabitant'`.
- [ ] Integrar guardrails: tiering Haiku, cache de respuestas, presupuesto diario/mensual, fallback a líneas pre-escritas por persona; auditar `request_id` en `AuditLog`.
- [ ] Evaluar Batches API de Anthropic (-50%) para el lote de chisme.
- [ ] Cron programado (baja frecuencia, p.ej. 1-2x/día) con jitter.
- [ ] UI: el `FeedItem` de Habitante se marca diegéticamente (no como bot saturado), dentro de la estética.

**DoD**: Chisme IA en el feed, atribuido al Habitante, dentro de marca y de presupuesto, con fallback; el feed no se siente vacío con pocos usuarios.

> Nota de costo/seguridad: validar ids de modelo (Haiku/Opus) y precios con la skill `claude-api` antes de fijar el presupuesto del job. El input de usuario nunca entra al `system` prompt; el chisme pasa por moderación de salida.

---

## OSIA-S3.6 — Endurecimiento, tiempo real, observabilidad y lanzamiento

- **Objetivo**: Cerrar la fase: tiempo real social opcional (push de notif/presencia), endurecimiento de seguridad/rate-limit, observabilidad, pruebas, y el ritual de lanzamiento a los invitados.
- **Duración estimada**: 1 semana.
- **Dependencias**: todos los sprints anteriores.
- **Riesgos**: regresiones de RLS; presupuesto IA del chisme mal calibrado; presencia fantasma. Mitigar con tests de RLS, alertas a Discord y health-checks.

### OSIA-S3.6-H1 — Tiempo real social (notificaciones y presencia push)

**Como** Residente **quiero** que las notificaciones y la presencia lleguen en vivo **para** que la red se sienta viva sin recargar.

**Criterios de aceptación**
- Dado que estoy en `apps/social`, cuando alguien me sigue/reacciona/comenta, entonces recibo un `Toast` en vivo (sin recargar).
- La presencia de amigos cambia en vivo (online/offline/zona).
- El transporte usa **Supabase Realtime** (canal por `account_id`) o un canal WS ligero reusando infra existente; degrada a polling si falla.

**Tareas técnicas**
- [ ] Elegir transporte: Supabase Realtime sobre `notifications`/`presence` (más barato, free tier) o suscripción al Pub/Sub Redis vía un gateway ligero.
- [ ] Cliente: suscripción por `account_id` con auth; invalidación de TanStack Query al recibir evento.
- [ ] Fallback a polling con backoff si el canal cae.
- [ ] UI: `Toast` del design system para llegadas; badge de campana en vivo.

**DoD**: Notif y presencia en vivo con fallback a polling, sin recargar, demostrable con 2 cuentas.

### OSIA-S3.6-H2 — Endurecimiento de seguridad y rate-limit

**Como** Dev/Operador **quiero** RLS, rate-limit y validación cerradas **para** proteger la red sin romper la atmósfera de lujo.

**Criterios de aceptación**
- RLS deny-all + ownership verificada por test (un usuario no lee/edita datos ajenos salvo lectura pública permitida).
- Rate-limit Redis activo y probado: `rl:post`, `rl:react`, `rl:follow`, `rl:chat`, `rl:upload` (token bucket Lua atómico) con `429 RATE_LIMITED`.
- Validación Zod en cliente Y servidor; el server nunca confía en el cliente.
- CORS allowlist (no `*`), security headers (HSTS/CSP/nosniff/frame DENY) en `apps/social` y `apps/api`.
- Cuarentena suave de cuentas nuevas (límites a la mitad las primeras 24h).
- Reportes manuales de Post/Comment → soft-delete por moderador (`account_role`/claim).

**Tareas técnicas**
- [ ] Suite de tests de RLS por tabla `social` (matriz usuario A vs B).
- [ ] Guard `@RateLimit` aplicado a todos los endpoints de escritura social; verificar buckets.
- [ ] Pipe de validación Zod global + validación en cliente.
- [ ] Headers de seguridad y CORS en ambas apps; Cloudflare WAF en `/api/*` de social.
- [ ] Endpoint `POST /v1/reports {targetType, targetId, reason}` + cola de moderación simple; soft-delete por moderador.
- [ ] Cuarentena suave en creación de cuenta (límites /2 24h).

**DoD**: RLS y rate-limit probados, validación doble, headers/CORS, moderación manual mínima, cuarentena activa.

### OSIA-S3.6-H3 — Observabilidad, métricas y pruebas

**Como** Dev/Operador **quiero** logs, errores y métricas sociales **para** operar la fase y saber si el Tejido Social engancha.

**Criterios de aceptación**
- Pino (logs con `requestId`, campos sensibles redactados) y Sentry (errores con source maps) integrados en `apps/social` y el contexto `social` de `apps/api`.
- Métricas instrumentadas: posts/día, reacciones/día, follows/día, % usuarios con >=1 post, gasto IA del chisme/mes, tamaño de `feed_items`, latencia de feed.
- Alertas a Discord `#alerts`: gasto IA > umbral, error rate, DB > 400MB.
- Tests: unitarios de casos de uso, contract tests de errores/DTOs, e2e del flujo publicar→fan-out→ver→reaccionar→notificar.

**Tareas técnicas**
- [ ] Logger Pino + Sentry en social (web + api); source maps en CI.
- [ ] Contadores Redis/Postgres + endpoint `/metrics` ampliado con métricas sociales.
- [ ] Alertas webhook a Discord.
- [ ] Suite e2e (Playwright o similar) del flujo social con 2 cuentas seed.
- [ ] `supabase db diff` en CI sin drift; contract test de `ErrorCode` verde.

**DoD**: Observabilidad y alertas activas, métricas sociales visibles, suite de tests verde en CI.

### OSIA-S3.6-H4 — Pulido editorial y ritual de lanzamiento

**Como** Anfitrión (Carlos) **quiero** lanzar La Red Social a los invitados con la estética OSIA pulida **para** producir el "esto se siente caro" y mantener el momentum.

**Criterios de aceptación**
- Estados vacíos, skeletons, motion (curva canónica, sin bounce, `prefers-reduced-motion`), sonido UI opt-in (`packages/ui/sound`) y contraste AA verificados en todas las pantallas sociales.
- El recorrido completo del entregable demostrable (§1.5) corre sin errores con 2-3 cuentas reales.
- Anuncio en Discord/waitlist (GTM comunidad-primero) con contenido del "ojo de OSIA".
- Puerta de decisión: si el feed/estatus no genera retorno, registrar aprendizaje (no-go parcial).

**Tareas técnicas**
- [ ] Pase de pulido visual (espacio negativo, champán escaso, tipografías Italiana/Jost, dark-first).
- [ ] Test de contraste AA automatizado en CI sobre las pantallas sociales.
- [ ] Sonidos UI sociales (`--sfx-notify`, `--sfx-reveal`) cableados con ducking.
- [ ] Smoke test manual del recorrido demostrable con cuentas reales.
- [ ] Material de anuncio + post en Discord; instrumentar D1/D7 social.

**DoD**: Fase pulida y lanzada a invitados, recorrido demostrable verde, métricas de retención social instrumentadas, aprendizaje registrado.

---

## 2. Matriz de Trazabilidad (Fase ↔ Entidades ↔ Contratos)

| Capacidad | Entidades | Endpoints REST | Eventos dominio | Sprint |
|-----------|-----------|----------------|-----------------|--------|
| Grafo | `Follow`, `profiles.*_count` | `POST/DELETE /v1/follows`, `/v1/profiles/{h}/followers\|following` | `social.follow.created/removed` | S3.2 |
| Reputación | `reputation_ledger`, `PopularityPoints` | (derivado, leído en perfil) | (acreditación interna) | S3.2 |
| Post/Feed | `Post`, `feed_items`, `FeedItem` | `POST /v1/posts`, `GET /v1/feed`, `/v1/media/upload-url` | `social.post.published` | S3.3 |
| Reacción | `Reaction` | `PUT/DELETE /v1/posts/{id}/reactions` | `social.post.reacted` | S3.3 |
| Comentario | `Comment` | `POST/GET /v1/posts/{id}/comments`, `DELETE /v1/comments/{id}` | `social.post.commented` | S3.3 |
| Presencia | `presence_sessions`, Redis `presence:{id}` | `GET /v1/presence` | `world.presence.joined/left` | S3.4 |
| Notificaciones | `Notification` | `GET /v1/notifications`, `POST .../read` | `social.notification.created` | S3.4 |
| Perfil/Estatus | `Profile`, `Achievement` (R) | `GET /v1/profiles/{h}` (+/posts) | — | S3.5 |
| Vestíbulo | catálogo `experiences` | (deep-link SSO) | — | S3.5 |
| Chisme IA | `Inhabitant`, `Post`, `FeedItem` | (job interno → `CreatePost`) | `social.gossip.published` | S3.5 |

## 3. Notas transversales de Rendimiento y Seguridad

- **Rendimiento**: paginación **siempre keyset/cursor** (no offset); `feed_items` particionado HASH(8) y leído por la partición del lector; invalidación de cache de feed en Redis; cron de poda; bundle de `apps/social` sin Three.js (<=250 KB gzip shell); fan-out-on-write válido para 2-3 usuarios (documentar umbral a fan-out-on-read).
- **Seguridad**: RLS deny-all + ownership por `auth.uid()` en todo `social`; solo email-verificados postean/reaccionan; rate-limit Redis en toda escritura; validación Zod cliente+servidor; media solo por URL prefirmada; voz humana sigue siendo P2P y nunca toca estos servicios.
- **Costo IA**: el chisme usa Haiku + Batches API (-50%) + presupuesto global mensual con kill-switch (degrada a líneas pre-escritas); todo turno auditado en `AuditLog`. El costo escala con engagement, no "por si acaso".
- **Marca**: estética editorial (FeedItem), `PopularityMeter` mineral (sin semáforo), champán escaso, dark-first, motion sin bounce, `prefers-reduced-motion`, sonido opt-in. El estatus es prestigio curado, no métricas de vanidad.
