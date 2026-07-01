# Fase 3.5 — La Red Social: Capa de Experiencia (UX de lujo)

> **Propósito.** Fase 3 dejó el backend social funcionalmente completo, pero con una UI "delgada" (sin
> navegación, sin llegar a tu perfil, sin comentarios, sin descubrimiento). Esta sub-fase construye la
> **experiencia de producto de lujo** que hace a La Red Social *lanzable* y que pasa su gate 3→4 ("el
> estatus se vuelve visible y deseado; una notificación trae de vuelta al jugador"). **Se cierra ANTES de S4.**
>
> **Estado:** ✅ **FUNCIONALMENTE CERRADA (2026-07-01).** Los 5 sprints (S3.7–S3.11) construidos y
> commiteados en `main` local (gates typecheck/lint/test 16/16; migraciones aplicadas+verificadas en cloud)
> + **QA exhaustivo multi-agente** de la matriz de autorización (§8) con sus huecos corregidos y verificados
> (destacó: el gating de cuenta privada faltaba en los caminos por id — unificado en un predicado; listas
> privadas gateadas; fan-out/feed respetan visibilidad; email-verificado en todas las escrituras). Detalle
> vivo por sprint en [`CLAUDE.md`](../../CLAUDE.md) §Estado actual.
> **Fecha:** 2026-07-01. Vinculante junto a [`CLAUDE.md`](../../CLAUDE.md) y el [backlog de Fase 3](./fase-3-tejido-social.md).

---

## 0. Decisiones de Carlos (vinculantes)

1. **PC-first, responsive, a TODO EL ANCHO.** Nada de "web de columna central". Layout de 3 columnas que
   usa el horizontal completo; se colapsa con gracia en tablet/móvil.
2. **Fondo oscuro. Primario dorado (champán). Secundario ÍNDIGO CELESTIAL** (cielo nocturno; el oro brilla
   como estrellas sobre el índigo — el más on-brand con estrella/luna/sol).
3. **Sensación de lujo / VIP / exclusividad** — "como un perfume caro de una marca cara". Cada detalle
   (loaders, modales de confirmación, vacíos, transiciones) comunica que estás en un lugar único que vale la pena.
4. **Posts con foto, VIDEO o solo texto** (estilo Instagram); reacciones + comentarios inline (estilo Facebook:
   lista de quién reaccionó y todos los comentarios ahí mismo). Todo paginado con loaders.
5. **Perfiles `/profile/<handle>` estilo Instagram:** foto de perfil + portada + descripción + nº seguidores +
   "en línea" (solo si esa persona te sigue). Editable solo si es tuyo.
6. **Perfiles PÚBLICOS y PRIVADOS**, con **solicitudes de seguimiento pendientes** (estricto tipo Instagram:
   un no-seguidor de una cuenta privada solo ve la cabecera + "Solicitar seguir"; el resto oculto hasta aprobar).
7. **Foto de perfil y portada REALES subidas por el usuario** (el avatar low-poly del Pasaporte queda de respaldo).
8. **Todo por componentes centralizados** (`@osia/ui`), SOLID, i18n EN+ES, sin nativos arbitrarios: un cambio de
   look se hace en UN lugar. **QA exhaustivo final** de TODAS las interacciones usuario×usuario (§9).

---

## 1. Sistema visual de lujo

> El lujo aquí es **contención**: el oro es escaso (como el champán), el movimiento es lento y caro, el
> espacio respira. La regla de marca §2.5 (solo Italiana + Jost) y el gamut se respetan.

### 1.1 Paleta (tokens semánticos nuevos para el contexto social)
| Rol | Token | Valor aprox. | Uso |
|---|---|---|---|
| Fondo base | `--social-bg` | ónix `#0B0B0F` con vignette/gradiente vertical sutil | lienzo |
| Superficie | `--social-surface` | `#14141B` (frosted, backdrop-blur) | cards, header, menús |
| Superficie elevada | `--social-surface-2` | `#1B1B27` con glow índigo tenue | modales, popovers |
| Primario (oro) | `--social-gold` | champán `#C9A961` | CTA clave, activos, wordmark, foco |
| Secundario (índigo) | `--social-indigo` | `#4B4A7D` (+ `#2A2A4A` profundo) | glows, tintes de superficie, acentos |
| Texto | `--social-ink` | marfil `#EDE6D6` | texto primario |
| Texto atenuado | `--social-ink-muted` | taupe `#8A8172` | secundario/metadatos |
| Hairline | `--social-hairline` | oro al 12–18% de opacidad | divisores finos de 1px |
| Peligro | `--social-danger` | granate sobrio `#8C3B3B` | destructivo (borrar) |

> Estos tokens se declaran como **capa semántica** en `@osia/ui/tokens` mapeando a los primitivos ya
> existentes (no valores crudos en componentes, §2.1). El índigo/oro/marfil viven aquí una sola vez.

### 1.2 Detalles que "se sienten caros" (biblioteca de gestos)
- **Oro escaso:** hairlines de 1px en oro translúcido, foco champán, subrayado activo — NO fondos dorados masivos.
- **Frosted glass:** header y menús con `backdrop-blur` sobre ónix → profundidad y sofisticación.
- **Glow índigo:** halo suave índigo detrás de avatares/medidor de popularidad/estados activos.
- **Grain sutil:** overlay de ruido muy tenue (≈3%) para textura de "papel fino", no plano digital.
- **Motion lento y eased:** 280–460ms `cubic-bezier(.2,.8,.2,1)`; fades y desplazamientos suaves, **nunca**
  rebotes. Respeta `prefers-reduced-motion` (degrada a fade instantáneo).
- **Loaders = skeletons con shimmer** (taupe→índigo), no spinners; los botones muestran carga inline.
- **Motivo celestial** reservado para vacíos/hero (una constelación tenue), coherente con El Mundo.
- **Tipografía:** Italiana solo en momentos ceremoniales (nombre del perfil en el hero, título de sección
  del vestíbulo social); Jost en todo lo demás, `tabular-nums` en conteos.

### 1.3 Accesibilidad (no opcional, §9 CLAUDE.md)
Contraste AA sobre ónix (marfil y taupe-500 como piso), foco champán siempre visible, navegación por teclado
completa (menús, tabs, modales con focus-trap), targets ≥44px, `aria-*` en todos los interactivos, no depender
solo del color (estados privados/en-línea con icono + texto).

---

## 2. Arquitectura del shell (responsive, a todo el ancho)

```
┌───────────────────────────────────────────────────────────────────────────────────┐
│ HEADER (fijo, frosted)                                                              │
│  [◉ OSIA]  [🔍 Buscar personas...........]              [🔔]  [ Avatar  Nombre ▾ ]  │
├──────────────┬──────────────────────────────────────────────┬──────────────────────┤
│ SIDEBAR IZQ  │  BODY / FEED (centro, ancho fluido)           │  RAIL DERECHO         │
│              │  ┌────────────────────────────────────────┐  │                        │
│  ◉ Inicio    │  │  [ Avatar ]  Publica algo…        [＋] │  │  EN LÍNEA AHORA        │
│  ◈ Mi perfil │  └────────────────────────────────────────┘  │   • María    ●         │
│  ✦ Descubrir │  ┌────────── PostCard ───────────────────┐   │   • Lucía    ●         │
│  ♟ Amigos    │  │ autor · tiempo · ⋯                      │   │                        │
│  🔔 Notif.   │  │ [media carrusel foto/video]            │   │  A QUIÉN SEGUIR        │
│              │  │ ★ ☾ ☀  ·  💬 12  ·  ↗                   │   │   • Ana  [Seguir]      │
│              │  │ reacciones ▸  ·  comentarios inline ▾   │   │   • Iván [Seguir]      │
│              │  └────────────────────────────────────────┘   │                        │
└──────────────┴──────────────────────────────────────────────┴──────────────────────┘
```

- **Header (`AppHeader`)**, fijo, frosted: `Logo` (→ Inicio) · `SearchPeople` (izq, pegado al logo) ·
  `NotificationsBell` (badge de no-leídas) · `ProfileMenu` (avatar + nombre, **dropdown**: Mi perfil ·
  Vestíbulo · Viajar al mundo · Cerrar sesión).
- **Sidebar izquierdo (`AppSidebar`)**: Inicio · Mi perfil · Descubrir · Amigos · Notificaciones. Iconos +
  etiqueta; activo con hairline dorado. (Reservado a futuro: Guardados, Ajustes.)
- **Centro**: composer "Publica algo" + feed paginado.
- **Rail derecho (`AppRail`)**: "En línea ahora" (de a quienes sigues, si te siguen) + "A quién seguir"
  (sugeridos). Aprovecha el horizontal; se oculta en < 1200px.
- **Responsive:**
  - **≥1200px (desktop):** 3 columnas (sidebar 260px · feed fluido · rail 320px).
  - **880–1199px:** 2 columnas (sidebar + feed; rail se pliega).
  - **<880px (móvil):** 1 columna; sidebar → **tab bar inferior** (Inicio · Descubrir · ＋Publicar ·
    Notificaciones · Perfil); búsqueda como icono que abre overlay; menú de perfil desde el header.
- **Idioma:** NO hay selector en social; se cambia en el Vestíbulo (cookie global del Pasaporte, ya afecta
  a las 3 apps). El menú de perfil enlaza al Vestíbulo.

---

## 3. Inventario de componentes (`@osia/ui` — declarar una vez, reusar en todo)

> Arquitectura (§2.2 CLAUDE.md): **primitivos** y **superficies** presentacionales viven en `@osia/ui`;
> reciben datos por props (tontos, sin fetch). `apps/social` compone y cablea datos (react-query). Así un
> cambio de look se hace en un solo lugar.

### 3.1 Primitivos nuevos/faltantes (`@osia/ui/primitives`)
`Dropdown`/`Menu` (con focus-trap y teclado) · `SearchInput` · `IconButton` · `Avatar` (foto real + fallback
al avatar low-poly + badge de presencia) · `Tabs` · `Skeleton` (shimmer) · `Spinner` inline · `Toast`/`Toaster`
· `ConfirmModal` (destructivo, granate) · `Badge`/`Count` · `Tooltip` · `Divider` (hairline) · `EmptyState`
(motivo celestial) · `MediaCarousel` · `VideoPlayer` (controles propios) · `ImageDropzone`/`Uploader` (progreso).

### 3.2 Superficies sociales (`@osia/ui/surfaces/social`)
`AppShell` (header+sidebar+rail+slot) · `AppHeader` · `AppSidebar` · `AppRail` · `MobileTabBar` ·
`ProfileMenu` · `PostComposerCard` · `PostCard` (media, meta, acciones) · `ReactionBar` (★☾☀ picker) ·
`ReactionListModal` (quién reaccionó, paginado) · `CommentList` + `CommentItem` + `CommentComposer` (inline,
paginado) · `ProfileHeader` (portada+foto+bio+conteos+CTA) · `ProfileEditModal` · `UserRow` (avatar+nombre+
handle+botón seguir) + `UserList` (paginada) · `FollowButton` (estados: Seguir/Solicitado/Siguiendo/Dejar de
seguir) · `PresenceDot` · `NotificationItem` + `NotificationList` (deep-link, infinito) · `SuggestionsRail` ·
`OnlineNowRail` · `PostDetail` (modal desktop / página móvil).

Cada componente: variantes + estados (default/hover/focus/active/disabled/**loading**/empty/error) + tokens
que consume, con i18n por prop. Nada de `<button>`/`<div>` tipográfico suelto (§2.1).

---

## 4. Superficies (pantallas) y sus estados

Para cada una: layout, estados (carga = skeleton, vacío = EmptyState, error = reintento), interacciones y su
autorización (detalle en §8).

### 4.1 Inicio / Feed (`/`)
Composer arriba ("Publica algo" → abre `PostComposer`, modal en desktop). Feed paginado (keyset infinito).
`PostCard`: autor (→ perfil), tiempo relativo, menú ⋯ (borrar si es mío → `ConfirmModal`; reportar si es ajeno),
media (carrusel foto/video con `VideoPlayer`), `ReactionBar` (★☾☀; una reacción por post, elegir otra reemplaza),
"reacciones ▸" (→ `ReactionListModal`), comentarios inline (`CommentList` paginado + `CommentComposer`). Cold-start
vacío → EmptyState con CTA a Descubrir.

### 4.2 Componer (`/compose` o modal)
Texto ≤2000 y/o hasta 4 medios (foto/video) por URL prefirmada (subida directa con progreso). Selector de
visibilidad (Público / Solo seguidores). Estados: subiendo (progreso por medio) / publicando / error tipado.

### 4.3 Perfil (`/profile/[handle]`)
Portada (16:5) + foto (círculo, glow índigo) + nombre (Italiana) + `@handle` + bio + conteos (posts/seguidores/
seguidos, tabular) + `PopularityMeter` + `PresenceDot` "en línea" (solo si ese perfil te sigue) + CTA:
- **Propio:** "Editar perfil" (→ `ProfileEditModal`: foto, portada, bio, **privacidad** público/privado).
- **Ajeno:** `FollowButton` (Seguir / Solicitado / Siguiendo) + ⋯ (reportar — diferido si no hay backend de
  reporte de perfil).
Grid de posts (Instagram) paginado. **Si privado y no-seguidor:** solo cabecera + "Solicitar seguir"; grid,
seguidores y seguidos ocultos (candado + copy).

### 4.4 Amigos (`/amigos`)
Tabs: **Seguidores · Seguidos · Solicitudes** (entrantes; badge). `UserList` paginada con `FollowButton`.
Solicitudes: Aceptar / Rechazar (rechazar → `ConfirmModal`). En cuenta propia privada, las solicitudes viven aquí.

### 4.5 Descubrir (`/descubrir`)
Sugeridos sin IA/ML: por reputación/popularidad + segundo grado (a quién siguen tus seguidos) + residentes
nuevos. `UserList` con motivo editorial de lujo. Paginado.

### 4.6 Búsqueda de personas (overlay desde el header)
Input con debounce → resultados `UserRow` (handle + nombre, prefijo). Estados: escribiendo/cargando/sin
resultados. No busca texto de posts (anti-alcance).

### 4.7 Notificaciones (`/notificaciones` + dropdown del header)
Primeras 10, **scroll infinito** (keyset). Cada `NotificationItem` con actor, copy i18n por tipo, tiempo, y
**deep-link** (follow/follow_request → perfil; reaction/comment/mention → post detail). "Marcar todas leídas".
`follow_request` con Aceptar/Rechazar inline. Badge de no-leídas en header+sidebar+tab bar (polling 30s).

### 4.8 Detalle de post (`PostDetail`)
Modal sobre el feed (desktop) / página `/post/[id]` (móvil). Post completo + todas las reacciones + todos los
comentarios. Respeta visibilidad (§8). Destino de deep-links y de "compartir".

---

## 5. Modelo de datos nuevo (migraciones forward-only, aplicadas al cloud)

> Numeración a continuación de la 0009. Espejo de enums en `@osia/shared`. RLS deny-all + grants service-only.

1. **`..010_social_profile_cards.sql`** — `social.profile_cards (account_id PK → identity.accounts, is_private
   boolean default false, photo_url text, cover_url text, updated_at)` + trigger updated_at + RLS. (Social dueño
   de su presentación/privacidad; identity.profiles no se toca.)
2. **`..011_social_follow_requests.sql`** — `follows.status` CHECK pasa a `('active','pending','blocked')`.
   El trigger de `followers_count/following_count` cuenta **solo `active`** (revisar y ajustar
   `..0001_social_follow_counts`). Índice para solicitudes entrantes: `idx_follows_pending (followee_account_id)
   WHERE status='pending'`.
3. **`..012_social_notifications_kinds.sql`** — `notifications.kind` CHECK += `'follow_request'`,
   `'follow_accepted'`.
4. **`..013_social_post_media_typed.sql`** — soportar video: `posts.kind` CHECK += `'video'`; **media pasa de
   `[url]` a `[{url,kind}]`** con `kind IN ('image','video')` (CHECK sobre el jsonb) + migración de datos de las
   filas existentes (`url` → `{url, kind:'image'}`). Bucket `post-media` acepta video ≤50MB / ≤60s (o bucket
   `post-video` aparte); límites en `@osia/shared`.
5. **`..014_storage_profile_media.sql`** — bucket público `profile-media` (foto+portada, solo imágenes, límites)
   para subida prefirmada (el API nunca recibe el binario).

> Presencia "en línea": se **deriva** (no migra) — la regla direccional (ver online solo si el objetivo te
> sigue) se aplica en el query de presencia (§6).

---

## 6. Backend nuevo (hexagonal, espejo de lo existente) — puertos, casos de uso, endpoints

- **Privacidad + edición de perfil:** `PATCH /v1/profiles/me` (isPrivate, bio) · `POST /v1/profiles/me/media/upload-url`
  (foto/portada, prefirmada) · `PATCH /v1/profiles/me/media` (fija photo_url/cover_url validando que sean de
  nuestro Storage). `GET /v1/profiles/{handle}` extendido: `isPrivate, photoUrl, coverUrl, viewerState`
  (self|following|requested|none) y **gating**: si privado y no-seguidor, oculta posts/listas.
- **Solicitudes de seguimiento:** `POST /v1/follows` a cuenta privada → crea `pending` + notif `follow_request`
  (a pública → `active` directo, como hoy). `GET /v1/follows/requests` (entrantes, keyset) ·
  `POST /v1/follows/requests/{followerId}/accept` (→ active, notif `follow_accepted`, +conteos) ·
  `POST /.../reject` (borra la fila). `DELETE /v1/follows` cancela seguir/solicitud (idempotente).
- **Feed/posts:** `GET /v1/posts/{id}` (detalle, reimpone visibilidad §8) · `DELETE /v1/posts/{id}` (soft-delete
  propio, con retiro de feed_items) · `GET /v1/posts/{id}/reactions?kind=` (quién reaccionó, keyset). Comentarios
  ya existen (crear/listar/borrar) — asegurar keyset. Media tipada en create/listar.
- **Descubrir/buscar:** `GET /v1/profiles/search?q=` (prefijo handle+displayName, respeta privacidad de
  resultados) · `GET /v1/discover/suggestions` (reputación + 2º grado + nuevos, excluye ya-seguidos y a ti).
- **Presencia:** `GET /v1/presence?accountIds=` con la regla direccional (online solo si el objetivo sigue al
  viewer) sobre `world.presence_sessions`.
- **Contratos `@osia/shared`:** `MediaItem {url,kind}`, `ProfileCardDto`/`PublicProfileDto` extendido con
  `viewerState`, `FollowRequestDto`, `ReactionActorDto`, `SearchResultDto`, `SuggestionDto`, schemas Zod de
  cada input (edición de perfil, privacidad, media) + enums (`FollowStatus += pending`, `NotificationKind +=
  follow_request/follow_accepted`, `PostMediaKind`).

---

## 7. Desglose en HU (slices verticales; QA por HU §9; migraciones al cloud; gates verdes)

Orden pensado para que **cada HU deje algo que se ve** y no haya código muerto (el puerto/UI se crea en la HU
que lo consume).

- **S3.7 — Sistema visual + shell de lujo.** Tokens (índigo/oro/marfil + gestos §1.2) en `@osia/ui`; primitivos
  faltantes (§3.1) mínimos; `AppShell` responsive (header + sidebar + rail + tab bar móvil), `ProfileMenu`,
  navegación entre secciones (aún con datos existentes). Sin backend nuevo. *Se ve:* la app ya se recorre y
  luce de lujo.
- **S3.8 — Perfiles de lujo: media + privacidad + edición.** Migraciones 010/014; backend de edición + media de
  perfil; `ProfileHeader`/`ProfileEditModal`; ruta `/profile/[handle]`; gating de privado (cabecera-only).
  *Se ve:* tu perfil con foto/portada, editable; perfiles privados bloqueados.
- **S3.9 — Grafo con solicitudes + Amigos + presencia.** Migraciones 011/012; flujo pending/accept/reject;
  `FollowButton` con estados; sección Amigos (tabs paginadas); `PresenceDot` con la regla direccional.
  *Se ve:* seguir cuentas privadas, aceptar/rechazar, "en línea".
- **S3.10 — Feed de lujo: foto/video, reacciones (lista), comentarios inline, detalle.** Migración 013 (media
  tipada + video); `GET/DELETE /posts/{id}`, `GET /posts/{id}/reactions`; `PostCard`/`ReactionBar`/
  `ReactionListModal`/`CommentList`/`PostDetail`/`VideoPlayer`; composer con foto+video. *Se ve:* el feed
  Instagram/Facebook completo.
- **S3.11 — Descubrir + Buscar + Notificaciones deep-link + cierre.** `search`/`discover`; `SearchPeople`;
  Descubrir; notificaciones con scroll infinito + deep-link + solicitudes inline; barrido de vacíos/estados;
  **QA exhaustivo (§9) multi-agente**; gates; docs; cierre de la sub-fase.

---

## 8. Matriz de autorización / visibilidad (corazón del QA)

> **Regla rectora:** el servidor decide la verdad; la visibilidad se **reimpone en cada write y read path**
> (no solo en el listado). Todo viewer está autenticado (SSO); escribir exige email verificado (`EmailVerifiedGuard`).

### 8.1 Dimensiones
- **Privacidad del objetivo:** público | privado.
- **Relación viewer→objetivo:** self · siguiendo(active) · solicitud-pendiente(pending) · no-sigue · (bloqueado, futuro).
- **Relación objetivo→viewer:** te sigue | no te sigue (para presencia).
- **Visibilidad del post:** público | solo-seguidores | privado(solo autor).
- **Email del viewer:** verificado | no (gatea escrituras).

### 8.2 Reglas (lo que DEBE cumplirse — se prueban todas en §9)
| Acción | Permitido si |
|---|---|
| Ver cabecera de perfil | siempre (cualquier autenticado) |
| Ver posts/seguidores/seguidos de perfil **privado** | self, o siguiendo(active). Pendiente/no-sigue → **oculto**. |
| Ver posts de perfil **público** | según visibilidad de cada post (abajo) |
| Ver un post `público` | cualquiera que pueda ver al autor |
| Ver un post `solo-seguidores` | self, o seguidor **active** del autor. (Pendiente NO cuenta.) |
| Ver un post `privado` | solo el autor |
| Reaccionar / comentar | solo si **puede ver** ese post (misma regla) **y** email verificado. No a lo que no ves. |
| Borrar post / comentario | solo el autor (propio) |
| Seguir cuenta pública | crea `active` al instante |
| Seguir cuenta privada | crea `pending`; NO da acceso hasta aceptar; notifica `follow_request` |
| Aceptar/Rechazar solicitud | solo el objetivo (dueño) de la solicitud |
| Ver "en línea" de X | solo si **X te sigue** (regla direccional de Carlos) y hay sesión abierta |
| Buscar / descubrir | resultados respetan privacidad (una cuenta privada aparece, pero su contenido sigue gated) |
| Reportar | cualquier autenticado, sobre post/comentario (perfil: fuera de alcance salvo pedido) |

### 8.3 Ejemplos de escenarios (muestra — la lista completa se enumera en el QA §9)
- "No puedo comentar la publicación de alguien que **no sigo** si su cuenta es **privada**." ✅ (403/oculto)
- "No puedo reaccionar a un post `solo-seguidores` de quien no sigo (o a quien solo le mandé **solicitud**)." ✅
- "Con **solicitud pendiente** NO veo sus posts ni sus listas; al **aceptar**, sí." ✅
- "Veo 'en línea' de alguien **solo si me sigue**, aunque yo lo siga a él." ✅
- "No puedo borrar el post/comentario de otro; sí el mío." ✅
- "Sin email verificado no puedo publicar/reaccionar/comentar/seguir/subir, pero sí leer lo visible." ✅
- "Un deep-link a un post que **no puedo ver** no me lo muestra (404/oculto), aunque me llegara la URL." ✅

---

## 9. QA exhaustivo (protocolo §10.1 CLAUDE.md, reforzado)

**Al cerrar cada HU** y como cierre de fase: dev+QA, recorriendo **todos los flujos por tipo de usuario y
relación** (§8.1), casos límite y estados (vacío/carga/error). En `S3.11` se corre un **QA multi-agente
adversarial** que:
1. **Enumera** el producto cartesiano de §8.1 (privacidad × relación × visibilidad × email × acción) → la lista
   completa de escenarios usuario×usuario, sin omitir ninguno.
2. **Verifica** cada uno contra el backend (contract/smoke) y la UI (estado correcto, sin fuga de datos).
3. **Intenta refutar** (adversarial): forjar IDs, deep-links a lo no visible, reaccionar/comentar a lo oculto,
   aceptar solicitudes ajenas, ver presencia sin cumplir la regla, etc.
Gates reales verdes (`typecheck`/`lint`/`test`/`build`), DTOs alineados back↔front, i18n EN+ES sin hardcode,
accesibilidad básica. Reporte honesto (hecho/probado/falta). Staged, sin commitear salvo que Carlos lo pida.

---

## 10. Anti-alcance de esta sub-fase (no sobre-construir)
❌ IA (sigue descartada al 100%) · ❌ DM/chat privado · ❌ grupos/hashtags/búsqueda de texto en posts ·
❌ recomendación por ML · ❌ monetización/cosméticos (Fase 4/5) · ❌ hilos de comentarios anidados (planos por
ahora; el schema los permite a futuro) · ❌ transcodificación de video (se guarda y reproduce el original con
límites) · ❌ bloqueo de usuarios (el `status='blocked'` queda listo pero su UX es futura) · ❌ subir binario al
API (solo URL prefirmada) · ❌ tocar `world-server` salvo leer presencia.
