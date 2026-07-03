# Handoff para Claude Fable 5 — sesión nueva (sin contexto)

> **Lee esto primero, junto con [`CLAUDE.md`](../CLAUDE.md).** Este documento te pone al día sobre un
> trabajo grande que arrancó en sesiones previas: una **auditoría de rediseño de todo el ecosistema
> OSIA** y su plan de reconstrucción en olas. La **Ola 0 (endurecimiento de seguridad) ya está hecha**
> — la hizo Opus 4.8 a propósito, porque los safeguards de Fable marcan el trabajo de «ciberseguridad
> ofensiva» (anti-cheat, exploits, tickets, open redirect) y hacían fallback a Opus una y otra vez.
> **Tu foco es el trabajo de PRODUCTO/UI**, que no dispara safeguards y es lo que Carlos más quiere.

---

## 0. Lo que Carlos quiere de ti (prioridad, en sus palabras)

1. **Rehacer la red social (`apps/social`) prácticamente desde cero, visual y funcionalmente.** Dice:
   «visualmente no me gusta mucho, siento que está muy vacío, siento que faltan muchas funciones».
   Quiere que la repienses entera — es una **capa de experiencia de lujo** («perfume caro / VIP»),
   PC-first responsive a todo el ancho, oscuro + oro champán + índigo celestial. Mantén las
   funcionalidades e idea de producto; el «cómo se ve y qué se puede hacer» es tuyo para reinventar.
2. **Rehacer el Vestíbulo (`apps/web`)** — «me gusta a medias».
3. Después, el **game-feel del Mundo 3D** (Ola 2 abajo): locomoción con peso, avatar animado, terreno.

**Restricción vinculante:** la **atmósfera visual del Mundo** (cielo, clima, estaciones, colores,
transiciones, sonido ambiental — todo `@osia/atmosphere` + los visuales de `world-client`) **NO se
toca a nivel visual**. A Carlos le encanta. Solo mejoras internas de código si hicieran falta.

---

## 1. Estado del proyecto (verdad al 2026-07-02)

- **Fases 0, 1, 2, 3 y 3.5 cerradas** (El Mundo camina + voz P2P + atmósfera; Identidad + Vestíbulo;
  Atmósfera Viva sin IA; Tejido Social; Red Social capa de experiencia). Detalle en `CLAUDE.md`.
- **IA descartada al 100%** (decisión de Carlos, vinculante). Sin Habitantes/NPC/chisme/ML.
- **Git:** rama `main`. `origin/main` estaba en `184646b`; hay **1 commit local sin push previo**
  (`b91a40f`, pulido) + **todo el trabajo de esta sesión en STAGED, sin commitear** (regla §0.1:
  Claude NUNCA commitea sin que Carlos lo pida). No hay upstream configurado en `main`.
- **Regla de oro:** dejar en `git add` (staged), reportar, y **no commitear ni pushear** salvo orden
  explícita de Carlos. Español neutro **sin voseo** en todo (código y trato).

---

## 2. La auditoría de rediseño (13 subsistemas) — ya hecha, NO la repitas

Se corrió un análisis first-principles de todo el ecosistema (un arquitecto por subsistema,
«¿cómo lo haría yo hoy desde cero?»). Los **13 veredictos completos con archivo:línea** viven en el
scratchpad de la sesión anterior; el resumen ejecutivo:

| Subsistema | Veredicto |
|---|---|
| `@osia/shared`, `@osia/atmosphere`, net/voz de world-client, HUD de world-client | **Mantener** |
| world-server, `@osia/ui`, identity/i18n/assets, api (identity y social), `apps/social`, `apps/web`, infra | **Refactorizar** |
| Mundo 3D jugable (movimiento/avatar/terreno) | **Rehacer parcial** |

**Conclusión clave:** la arquitectura de fondo es sólida (netcode nivel Gambetta/Valve, hexagonal
real, tokens de diseño y contraste AA en CI, motor de atmósfera excelente). Lo que se rehace son
**bugs reales y promesas a medias**, no la arquitectura.

El plan se organizó en **5 olas**. La Ola 0 ya está. Las demás siguen pendientes (§4).

---

## 3. Ola 0 — YA HECHA por Opus (staged, gates verdes). NO la rehagas; constrúyela por encima.

Endurecimiento de seguridad/robustez. **typecheck 16/16, lint 16/16, test 16/16 verdes.** Todo staged.

**`@osia/shared`**
- `decode` de `INPUT` rechaza `yaw`/`dtMs` no finitos (NaN/±Inf) — cerraba un griefing que envenenaba
  la posición autoritativa. Defensa en profundidad en `applyMovement`. Tests nuevos en `codec.test.ts`.
- `normalizeChat` recorta por codepoints (no parte surrogate pairs → sin `�`).
- `ErrorMsg.code` tipado como `WireErrorCodeValue` (era `number`).
- Nuevo `ErrorCode.EMAIL_TAKEN`. Nuevo `MAX_SIM_DT_PER_TICK_S` (presupuesto anti speed-hack).

**world-server**
- Emisión ANÓNIMA de tickets (`POST /world/tickets`) **apagada en prod** (`config.allowAnonTickets`,
  flag `WORLD_ALLOW_ANON_TICKETS`; encenderla en prod = error fatal). Cerraba entrada/suplantación sin cuenta.
- **Apagado limpio** (SIGTERM/SIGINT) + **barrido de presencia al arrancar** → mata la «presencia
  fantasma» (online eterno tras un crash, visible en la red social).
- **Presupuesto de dt simulado por tick** en `Instance.step` → cierra el speed-hack. Test nuevo.
- Rechazo de opcodes S2C (`≥0x80`) antes de decodificar; off-by-one de la cola de inputs.

**world-client (red)** — clamp de dt en el cliente (elimina el snap tras tab-switch), wrap-around de
yaw en la interpolación, jitter en el backoff de reconexión, cap de `pending`, docstring corregido.

**apps/api** — `email_exists` → 409 `EMAIL_TAKEN` (era 500); logout con **cliente Supabase efímero**
(cierra una carrera cross-usuario que podía desloguear a terceros) + scope `local`; `ZodValidationPipe`
metadata-aware (deja de romper con `@UsePipes` + param decorators). El fix de **ruta duplicada**
`GET /v1/profiles/{handle}` (identity tapaba a social → el perfil llegaba sin `viewerState`; era EL bug
del «mi perfil se ve como ajeno / privado») ya estaba staged con `route-collision.test.ts`.

**apps/social** — `SessionGuard` solo redirige al Vestíbulo con **401** (un 5xx/red ya no expulsa a un
usuario logueado; muestra reintento). Fuentes de marca ahora llegan a `apps/social` (ver infra).

**apps/web** — `resolvePostLoginUrl` en `@osia/identity` (cierra el **open redirect** `?next=//evil.com`
y arregla el `returnTo` cross-app roto: social→login→social). `/verify` sin email redirige a `/join`.

**tooling/infra** — 60 artefactos `.js/.d.ts/.map` compilados que estaban commiteados dentro de
`packages/atmosphere/src/` **eliminados** + `.gitignore` que evita reincidencia + `build` de atmosphere
a `--noEmit`. `sync-fonts.mjs` (postinstall) ahora copia también a **`apps/social`** (causa raíz real
del bug de fuentes). `turbo.json` con `globalEnv` (NEXT_PUBLIC_*/WORLD_*/SUPABASE_*). Security headers
en `infra/Caddyfile`. Voseos del tooling corregidos.

**Diferidos de la Ola 0** (documentados, NO bloquean): runner de tests por descubrimiento (revertido —
`tsx --test` en Node 20 recoge `.js` de `dist/` y omite `.ts`; necesita Node 21 o un script que excluya
`dist/`); `format:check` en CI (requiere un pase de formato de todo el repo primero); `DROP INDEX
social.idx_feed_acct_score` (índice muerto — va con las migraciones de Ola 1).

---

## 4. Olas 1-4 — PENDIENTES (el mapa de reconstrucción)

Son independientes entre sí; puedes tomarlas en el orden que Carlos priorice. **Su prioridad declarada
es la red social (parte de Ola 3) y el Vestíbulo, luego el Mundo (Ola 2).**

### Ola 1 — Confianza (backend, algo toca seguridad → puede saltar a Opus)
> **Ola 1A YA HECHA por Opus (staged, gates 16/16 verdes, migración aplicada+verificada en cloud):**
> fixes de correctitud self-contained de social/economy — `listProfilePosts` unificado sobre el
> predicado `post-visibility.ts` (eliminada la última copia manual de la regla de visibilidad, que era
> la clase del hueco crítico); TOCTOU de follow cerrado (el `status` pending/active se decide dentro del
> INSERT leyendo `is_private` en la misma snapshot); `POST /v1/reports` valida que el target exista
> (404 si no, no contamina la cola de moderación); `unfollow` limpia del feed los posts del ex-seguido
> (CTE atómico); `DROP INDEX social.idx_feed_acct_score` (índice muerto, amplificación de escritura sin
> lector) — migración `20260702000001`, aplicada y verificada. **Lo que sigue de Ola 1 (pendiente):**
- **Outbox transaccional** en `apps/api` (social/economy): hoy el fan-out del feed + reputación +
  notificaciones dependen de un `EventEmitter` in-process fire-and-forget tras el commit. Si el proceso
  muere, **el post no llega a NINGÚN feed (ni al del autor) sin rastro**. Tabla `social.outbox` escrita
  en la misma tx + dispatcher (cron). Desbloquea además correr el API con >1 instancia.
- **Sesión SSO server-side** (patrón database-session tipo Lucia/Auth.js): elimina el «logout aleatorio
  del ecosistema» por rotación de refresh multi-app y da revocación real. (El fix táctico del logout ya
  está en Ola 0; esto es la solución de fondo.)
- **Privacidad de media:** hoy las fotos de cuentas privadas/posts followers viven en buckets PÚBLICOS
  — URL filtrada = acceso permanente; «borré mi foto» no borra el binario. Bucket privado + URLs firmadas
  con TTL + borrado de objetos al soft-delete.
- **Tests de integración HTTP reales** (supertest sobre la app Nest completa) + job de CI
  «migraciones-desde-cero» + **separación dev/prod** (hoy `dev == prod`: una sola base Supabase, el dev
  local corre contra producción — crítico antes de lanzar). Cursor keyset sin pérdida de µs. Dedup de
  notificaciones. Unificar `listProfilePosts` sobre `post-visibility.ts`. Alinear RLS al predicado.
  `DROP INDEX idx_feed_acct_score`.

### Ola 2 — El Mundo se siente vivo — ✅ HECHA (Fable, 2026-07-02; gates 16/16 sin caché + build + e2e)
> La atmósfera NO se tocó (congelada): mismo material/tinte del suelo, mismos colores; solo silueta
> y lenguaje corporal nuevos. 4 sprints M1–M4, todo en STAGED:
- **M1 — Locomoción con peso** (`@osia/shared`, pura y determinista, compartida cliente↔servidor):
  la velocidad PERSIGUE a la objetivo (`MOVE_ACCEL` 18 / `MOVE_BRAKE` 24 m/s², snap-a-cero con
  `MOVE_STOP_EPS`) + **colisión de círculos contra árboles/monolito/borde que DESLIZA** (2 pasadas,
  `WORLD_OBSTACLES` singleton nuevo en layout.ts). `vx/vz` viaja en WELCOME/ENTITY_JOIN/DELTA
  (**PROTOCOL_VERSION 6→7**; DELTA 44 B/entidad — 12 jugadores = 539 B < presupuesto 1500) porque el
  replay de la reconciliación DEBE partir de la MISMA inercia autoritativa. `Instance.step` persiste
  velocidad entre ticks; tests nuevos (aceleración, frenado exacto a 0, determinismo bit a bit,
  monolito no atravesable, presupuesto anti speed-hack con tiempo simulado IGUALADO). e2e
  `pnpm --filter @osia/world-server verify` verde contra el server vivo.
- **M2 — Terreno con relieve + scatter** (`world-client/src/world/terrain.ts` + `Scatter.tsx`):
  altura pura por suma de senos (SIN PRNG; plaza del monolito PLANA, realce del borde como valle,
  ondulación ≤0.34 m en lo caminable — la sim sigue 2D, la altura solo VISTE), disco polar no
  indexado ~2.9k tris; **700 briznas + 48 rocas** sembradas (mulberry32, esquivan obstáculos) en
  2 InstancedMesh (§7) teñidas por estación (§6: pasto `foliage`, roca `ground`). Árboles, avatar
  local y remotos POSADOS en la altura.
- **M3 — Avatar procedural** (`avatarMotion.ts`, UNA implementación para local y remotos): giro con
  damping por arco corto (adiós snap), bob ligado a la DISTANCIA recorrida, lean por aceleración +
  lean de carrera, manto que arrastra/ondea, chispa que orbita más rápido al correr, respiración en
  reposo. `prefers-reduced-motion` apaga los loops y conserva postura/giro. `AvatarMesh` ganó grupo
  interior + `partsRef` (sigue tonto). Remotos derivan velocidad de la interpolación (cero red).
- **M4 — Cámara con oclusión + input a tasa fija** (`cameraOcclusion.ts`): rayo mirada→cámara contra
  cilindros de los MISMOS obstáculos (con altura aproximada: pasa por encima de copas) + muestreo del
  relieve; acerca AL INSTANTE, se re-aleja suave (`CAM_RECOVER_LAMBDA`). INPUT coalescido a
  `INPUT_SEND_HZ=60` (a 120/144 Hz: mitad de paquetes, mismo tiempo simulado) con **preview local del
  tramo no enviado** → render de alta tasa igual de suave.
- **M5 — Pulido con el feedback de Carlos (2026-07-02, tras jugarlo) + QA adversarial:**
  - **Colisión al cuerpo, no a la copa** (Carlos: «nunca alcanzo a pegarme al árbol»): radios de
    colisión desacoplados del render — `TREE_COLLISION_RADIUS 0.42/escala` (te metes ~0.4 m entre
    las hojas del pino grande), `MONOLITH 1.6→1.05`, `PLAYER_RADIUS 0.6→0.35` (ahora lo TOCAS).
  - **Cámara sin zoom de golpe** (Carlos: «horrible»): patrón industria (Genshin/Zelda) — la cámara
    colisiona SOLO con el terreno; árbol/monolito que se interponen se DESVANECEN con dither
    (`alphaHash`, canal alfa por-árbol en la DataTexture del bosque + `cameraRay.ts` singleton).
  - **Pasto**: fade por distancia EN GPU (brizna se encoge según distancia a cámara, atributo
    instanciado + smoothstep 13→19 m, cero CPU) y **superficie estacional propia `grass`** en
    @osia/atmosphere (§6: dato nuevo) — en otoño oliva-verdoso (#5f7530), NO el naranja del follaje.
  - **Chispa calmada**: órbita lenta, plana y pequeña (r 0.16, 0.5→1.2 rad/s, sin bamboleo).
  - **QA adversarial (2 revisores) — hallazgos corregidos:** (1) ALTO: agujero de 1 m en el centro
    del terreno (guarda del triángulo degenerado invertida); (2) ALTO: el presupuesto anti
    speed-hack DESCARTABA tiempo simulado de clientes honestos tras un hitch/ráfaga TCP (snap
    0.15–0.9 m) y a la vez permitía **2× de velocidad sostenida** → reemplazado por **token bucket**
    (`SIM_BANK_CAP_S 0.25` + refill 1.05× tiempo real; procesa hasta el crédito y DEJA el resto en
    cola, ackea SOLO lo procesado — test verifica bit a bit contra el replay); (3) MEDIO: el resume
    teletransportaba desde posiciones legítimas (borde/árbol, igualdad al ulp) → `isPositionTenable`
    tolerante + velocidad a cero al reubicar; (4) yaw normalizado en el borde (anti-spin, branchless
    anti-DoS), seq duplicados rechazados vs la cola, dt del replay == dt del server al bit,
    literales de input fuera del hot path (§7), piso de cámara 1.2 m, guardia de `rayLen`.
  - **Diferidos documentados:** AOI 45 m < diámetro 47 m (remoto antipodal puede congelarse sin
    LEAVE — preexistente F0); validar finitud en decode S2C (defensa en profundidad); bisección del
    retroceso de cámara vs terreno; `receiveShadow` en rocas. El FEEL fino sigue siendo ajustable
    (constantes = datos): accel/brake, bob/lean, fades, radios.
- **Pendiente de Carlos:** volver a jugarlo y decidir si el feel quedó (las constantes están
  listadas arriba). **Sprint propuesto (sin comprometer): «rediseño visual del avatar»** — M3 animó
  el cuerpo EXISTENTE (cono+cabeza+chispa); si quieres un personaje nuevo, es un sprint aparte.

### Ola 3 — La Red Social de lujo + Vestíbulo (LO QUE CARLOS MÁS QUIERE — 100% Fable)
- **`apps/social` — ✅ RECONSTRUIDA (Fable, 2026-07-02).** Rehecha visual y funcionalmente sobre el
  «Salón de 3 columnas» en 6 sprints R1–R6 (gates 16/16 verdes sin caché; 6 migraciones aplicadas al
  cloud y verificadas; QA multi-agente sin críticos/altos). Detalle completo en el bloque de estado de
  `CLAUDE.md`. Entregado: validación runtime de respuestas (zod), optimistic updates con rollback,
  `Toast`/`ErrorState`, teclado APG en `Menu`/`Tabs`, metadata por ruta, comentarios anidados, menciones
  con autocompletado, reportar, compartir, **editar, guardados, eco/repost, bloquear+silenciar, y DM**.
  - **Diferidos de la sub-fase (documentados, no bloquean):** (1) **`Modal`→`<dialog>` nativo** — se
    evaluó y se DESCARTÓ: el `Modal` actual ya cumple focus-trap+Esc+aria, migrar sería riesgo de
    regresión sin ganancia visible. (2) **RLS de `social.posts`/`comments` al nivel del predicado
    unificado** (incl. bloqueo) — hoy la verdad la impone el API service_role; para las tablas NUEVAS
    (bookmarks/mutes/dm) la RLS sí es deny-all correcta. (3) **`listReactors` no oculta la reacción
    previa de un bloqueado** en tu propio post (cosmético, hallazgo BAJO del QA). (4) **DM ignora la
    privacidad de cuenta a propósito** (cualquier verificado inicia; solo el bloqueo corta) — decisión
    de producto declarada, revisar si hay abuso. (5) **`generateMetadata` es de MARCA, no de contenido**
    (la red es por invitación; un preview público filtraría contenido privado) — endpoint OG público
    queda como opción futura consciente. (6) Tiempo real por **polling** (feed/notif/DM); Supabase
    Realtime es Ola 4. (7) **Outbox transaccional** (Ola 1): eco/DM heredan el `EventEmitter`
    fire-and-forget para sus notificaciones.
- **`Menu`/`Tabs` de `@osia/ui`**: ✅ arreglados en R1 (patrón WAI-ARIA APG completo: flechas/Home/End,
  roving tabindex, devolución de foco). `Modal` ya era accesible (ver diferido 1 arriba).
- **Vestíbulo (`apps/web`) — ✅ HECHO (Fable, 2026-07-02).** Los 5 slices V1–V5 construidos y
  verificados (gates 16/16 sin caché, build de web verde, todo en staged):
  - **V1 — Recuperación de contraseña (por OTP, espejo del verify-email):** contratos
    `forgotPasswordSchema`/`resetPasswordSchema` + `EMAIL_OTP_LENGTH=8` en `@osia/shared`;
    `AuthSessionPort.sendPasswordReset/resetPassword` + `SupabaseSessionAdapter` (cliente EFÍMERO:
    `verifyOtp({type:'recovery'})` → `updateUser({password})` → `signOut({scope:'others'})` — el
    reset REVOCA las demás sesiones); use-cases con test (4/4); `POST /v1/auth/forgot-password`
    (204 SIEMPRE, sin oráculo) y `POST /v1/auth/reset-password` (200 `{session}` + cookie, espejo
    de verify-email); cliente `forgotPassword/resetPassword`; UI `/recuperar` en 2 pasos
    (email → CodeInput + contraseña ×2, auto-login) + link «¿Olvidaste tu contraseña?» en el login;
    i18n `recover.*` en+es. **E2E REAL contra el cloud** (cuenta desechable por admin API, borrada
    al final): reset 200+cookie ✓, login clave nueva 200 ✓, clave vieja 401 ✓, OTP single-use
    410 ✓, `same_password` 422 con detail ✓. **⚠️ ÚNICO PENDIENTE DE CARLOS:** verificar en el
    dashboard de Supabase que el template **Reset password** muestre `{{ .Token }}` (como se hizo
    con Confirm signup); el e2e saltó el email vía `generateLink`, no lo prueba.
  - **V2 — Sección «Cuenta» en el pasaporte** (`AccountSection`): selector de idioma es/en (cookie
    `osia.locale` + `router.refresh()`; verificado por SSR: con cookie `en` la página sale en inglés
    y `<html lang="en">`) + «Borrar mi cuenta» con Modal de confirmación →
    `requestAccountDeletion()` (flujo por email de S2-C2 ya existente) + estado «revisa tu correo».
  - **V3 — Skeletons de lujo** (Vestibule + PassportEditor) con la MISMA silueta del contenido,
    `aria-busy` + `.osia-sr-only` (clase nueva en @osia/ui); documentado en código POR QUÉ no hay
    SSR de sesión (cookie de refresh single-use; el SSR real es Ola 1). Puerta social: ya estaba
    `live` en el catálogo (S3.5-H2) — verificado, nada que activar.
  - **V4 — §2.1 completa en apps/web:** TODO texto nativo migrado a `Text` (6 páginas + 8
    componentes; `/styleguide` exenta por dev-only). `Text` ganó `htmlFor` (labels) y tonos
    `strong`/`success`; CSS: `.osia-hero--wordmark` (momento de marca del landing) y tonos nuevos.
    Mapeo: h1 páginas→`hero`, kickers/labels→`caption`, párrafos→`read`, ceremoniales→`display`,
    pequeños→`body`. Grep de violaciones (`fontFamily|fontSize|osia-overline|…` inline): 0.
  - **V5 — Gates:** typecheck/lint/test **16/16 sin caché**, `next build` de web verde
    (first-load ~155 kB, sin Three), smoke de rutas 200, e2e de auth arriba. Todo **staged, sin
    commitear** (§0.1).

### Ola 4 — Lanzable (infra/deploy → algo puede saltar a Opus)
- Pipeline de entrega (hoy **no se puede desplegar el producto completo**: el API ni emite artefacto):
  apps Next → Vercel; api/world-server → Docker multi-stage + GHCR. Runbook de migraciones con backup.
  Sentry + alertas. TURN real para voz. Realtime en vez de polling. Rate-limit por cuenta en Redis.

---

## 5. Cómo trabajar (vinculante — de CLAUDE.md)

- **QA por HU (§10.1):** dev + QA, todos los flujos por tipo de usuario, gates **reales** verdes
  (`pnpm typecheck/lint/test`), DTOs alineados back↔front, tests. Que no se escape nada.
- **SOLID, sin smells, sin `any`, i18n en+es sin texto hardcodeado, todo por `@osia/ui` + tokens** (§1-3).
- **Migraciones** forward-only, aplicadas al cloud con `supabase db push --db-url` (§14) — pero OJO con
  el `dev == prod` (Ola 1); coordina con Carlos antes de tocar la base.
- **Componentes centralizados**: nada de UI nativa; cada primitiva se declara una vez en `@osia/ui`.
- **Deja en staged, no commitees**, y reporta con honestidad qué quedó hecho, probado y pendiente.

> Cuando retomes: di «sigo con la red social» (o lo que Carlos priorice) y arranca por un plan corto de
> esa app. No necesitas re-auditar ni rehacer la Ola 0 — está hecha y verde.
