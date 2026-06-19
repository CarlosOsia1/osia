# Backlog de Sprints — Fase 4: Juego y Estatus

> Propósito: Definir el plan de ejecución sprint a sprint de la Fase 4 (primer minijuego con ranking, cosméticos y vitrina de estatus) para un dev solo. | Estado: Borrador v1 | Fecha: 2026-06-19 | Parte del paquete de diseño OSIA.

Cross-links:
- Visión y alcance: ver [../00-vision-alcance.md](../00-vision-alcance.md)
- Pilares y experiencia: ver [../01-pilares-experiencia.md](../01-pilares-experiencia.md)
- Marca y design system: ver [../02-marca-design-system.md](../02-marca-design-system.md)
- Arquitectura del sistema: ver [../03-arquitectura-sistema.md](../03-arquitectura-sistema.md)
- Modelo de datos (ER): ver [../04-modelo-datos-er.md](../04-modelo-datos-er.md)
- Tiempo real, mundo y networking: ver [../05-realtime-mundo-networking.md](../05-realtime-mundo-networking.md)
- Motor de atmósfera: ver [../06-motor-atmosfera.md](../06-motor-atmosfera.md)
- Habitantes de IA: ver [../07-habitantes-ia.md](../07-habitantes-ia.md)
- Estrategia de rendimiento: ver [../08-estrategia-rendimiento.md](../08-estrategia-rendimiento.md)
- Seguridad, infra y costos: ver [../09-seguridad-infra-costos.md](../09-seguridad-infra-costos.md)
- Contratos de API y eventos: ver [../10-contratos-api-eventos.md](../10-contratos-api-eventos.md)
- Glosario y lenguaje de dominio: ver [../11-glosario-dominio.md](../11-glosario-dominio.md)
- Backlogs previos: ver [./fase-3-tejido-social.md](./fase-3-tejido-social.md)

---

## 1. Encuadre de la fase

### 1.1 Objetivo de la fase

Encender el cuarto pilar del ecosistema OSIA — **Estatus y Juego** — entregando **Los Juegos** como app independiente (`apps/games`) que se enchufa al Vestíbulo y al Pasaporte ya existentes. La fase nace de una promesa concreta: que entre dos amigos exista por primera vez **prestigio competitivo medible, visible y deseable**, sin romper la contención de lujo de la marca y sin pay-to-win.

La Fase 4 entrega:

1. Un **framework genérico de juego** (Game → MatchSession → Score) server-authoritative, anti-cheat por contrato, reutilizable por futuros minijuegos.
2. **Un minijuego concreto** coherente con el mundo a pie + atmósfera: **"Cosecha de Meteoros" (Meteor Run)** — un evento jugable diegético dentro de El Mundo, donde se recogen fragmentos de luz caídos durante una ventana cronometrada; el score es server-authoritative (el cliente propone inputs, el servidor cuenta).
3. **Leaderboard global** en Redis ZSET (en vivo) + **RankingSnapshot** durable al cierre de cada temporada/ventana.
4. **Achievements** (logros) con rareza, incluido el tier `celestial`, otorgados server-side y verificados.
5. **Economía cosmética v1**: Cosmetic + InventoryItem + Transaction(virtual) + ReputationLedger; cómo se ganan (premios de ranking, logros, asistencia a eventos) y cómo se equipan (que viajan en el Pasaporte entre apps).
6. **Vitrina de estatus**: una superficie del Pasaporte que muestra rango, logros, cosméticos equipados y trofeos de temporada — el estatus se vuelve mostrable.
7. **Rival de IA** (persona "El Cronista del Cielo" o un rival nombrado) conectado al ranking: chisme pre-partida barato (Haiku) y cara a cara de momento clave (Opus) — extensión de la Fase 2.

### 1.2 Qué NO entra en esta fase (anti-alcance)

- NO un catálogo de 10 juegos. UN minijuego brutalmente pulido (escasez como estética).
- NO matchmaking competitivo masivo / ELO global público. El círculo es de 2-3 amigos; el ranking es de prestigio, no de emparejamiento.
- NO compra de cosméticos con dinero real todavía. La moneda es virtual (puntos de reputación / fragmentos). La monetización real con dinero llega en Fase 5+.
- NO pay-to-win: ningún cosmético ni compra afecta el score. El estatus se gana, no se compra.
- NO economía de mercado entre jugadores (trading). Solo inventario propio.
- NO plots/terrenos ni escasez de invitaciones (es Fase 5+).

### 1.3 Definition of Done de la FASE

La Fase 4 se considera terminada cuando, en staging con dos cuentas reales (Carlos + 1 amigo):

1. **App independiente y deep-link**: `apps/games` está desplegada en `games.osia.localhost` (prod: `games.osia.com`), aparece como una **puerta** en el Vestíbulo (catálogo declarativo `packages/shared/catalog/experiences.ts` con `{id:'games', estado:'live', fase:4}`), y es accesible por deep-link autenticado con el Pasaporte compartido (SSO) sin pasar por el Mundo.
2. **Bucle de juego completo**: un Residente puede iniciar una `MatchSession` de Meteor Run, jugarla a pie en una instancia del Mundo (o en una arena dedicada), y al terminar el servidor calcula y persiste un `Score` verificado (`is_verified=true`).
3. **Anti-cheat por contrato**: NO existe endpoint que acepte un score desde el cliente. El score se escribe SOLO server-side (world-server → apps/api). Un intento de `POST` de score arbitrario es rechazado (no existe la ruta / 403).
4. **Leaderboard vivo + snapshot**: el leaderboard global lee de Redis ZSET con latencia baja; al cerrar una ventana/temporada un job materializa un `RankingSnapshot` durable en Postgres y reparte premios.
5. **Achievements**: al menos 5 logros definidos (incluido 1 `celestial` ligado al evento de lluvia de meteoros), otorgados automáticamente server-side, visibles en el Pasaporte; el borrado de cuenta los purga.
6. **Cosméticos**: al menos 6 cosméticos en la paleta de marca (champán/ónix/marfil/taupe), ganables por ranking/logros/asistencia, con inventario y equip/unequip; el cosmético equipado viaja en el snapshot del Pasaporte y es visible en El Mundo (nameplate/aura) y en La Red Social (FeedItem/ProfileHeader).
7. **Vitrina de estatus**: el Pasaporte (`packages/identity` + apps/web) muestra rango actual, mejor score, trofeos de temporada, logros y cosméticos equipados.
8. **Rival IA**: el rival comenta el ranking, lanza un "chizo" pre-partida (Haiku) y tiene un cara a cara de momento clave (Opus) tras una partida memorable, dentro de presupuesto de tokens y con fallback offline.
9. **Guardarraíles**: RLS deny-all en `schema game` y `schema economy`; lectura pública de rankings/balance por el cliente, escritura solo service-side; idempotencia en `transactions`; rate-limits Redis para inicio de partidas y equip; presupuesto de IA del rival dentro del kill-switch global.
10. **Métricas instrumentadas**: partidas/sesión, % de Residentes que llegan al leaderboard, cosméticos equipados, costo de IA del rival/sesión, y la métrica cualitativa "quiero subir en el ranking".
11. **CI verde**: migraciones `game`/`economy` aplican forward-only; contract test (cada `code` de `apps/api` existe en `ErrorCode` de shared); `supabase db diff` sin drift; tests de cálculo de score determinista.

### 1.4 Entregable demostrable (demo guion)

> Carlos y su amigo abren la **puerta "Los Juegos"** desde el Vestíbulo (deep-link autenticado). El amigo ve el leaderboard vacío y un rival IA que lo provoca: *"¿Vienes a cazar luz? El cielo no espera a los lentos."*. Cruzan a una arena del Mundo bajo atmósfera crepuscular; empieza una ventana de **Cosecha de Meteoros** de 90s. Recogen fragmentos a pie; el servidor cuenta. Al cerrar, aparece el score verificado de ambos en el leaderboard en vivo, el amigo queda primero, gana **3 cosméticos** (un aura champán por el rango, un trofeo de temporada, un logro). El rival IA hace su cara a cara (Opus): *"Suerte de principiante. La luna recuerda a sus campeones... por ahora."*. El amigo abre su **Pasaporte**: ve su rango #1, su trofeo, su aura equipada. Vuelve a El Mundo y su nameplate ahora brilla con el aura. Entra a La Red Social y su ProfileHeader muestra el trofeo. **El estatus se hizo visible y mostrable.**

---

## 2. Mapa de sprints

Dimensionados para **un (1) dev solo**, ~1–2 semanas cada uno. Numeración `OSIA-S4.x`.

| Sprint | Título | Duración | Depende de |
|---|---|---|---|
| OSIA-S4.1 | Fundaciones de dominio: schemas `game` + `economy`, contratos compartidos, app `apps/games` y puerta del Vestíbulo | 2 sem | Fases 1–3 (identidad, SSO, Vestíbulo, social, world-server) |
| OSIA-S4.2 | Framework de juego server-authoritative: Game / MatchSession / Score (anti-cheat por contrato) | 2 sem | S4.1 |
| OSIA-S4.3 | Minijuego "Cosecha de Meteoros": loop jugable a pie en arena + scoring determinista | 2 sem | S4.2, motor de atmósfera (F2), world-server (F0) |
| OSIA-S4.4 | Leaderboard global (Redis ZSET) + RankingSnapshot durable + temporadas | 1–2 sem | S4.2, S4.3 |
| OSIA-S4.5 | Achievements (logros) con rareza `celestial`, otorgamiento y verificación server-side | 1–2 sem | S4.2, S4.4 |
| OSIA-S4.6 | Economía cosmética v1: Cosmetic / InventoryItem / Transaction / ReputationLedger; ganar y equipar | 2 sem | S4.4, S4.5 |
| OSIA-S4.7 | Vitrina de estatus en el Pasaporte + propagación cross-app del cosmético equipado | 1–2 sem | S4.6 |
| OSIA-S4.8 | Rival de IA conectado al ranking (Haiku chisme / Opus cara a cara) + guardarraíles de costo | 1–2 sem | S4.3, S4.4, Fase 2 (pipeline IA) |
| OSIA-S4.9 | Endurecimiento, anti-cheat profundo, observabilidad, balance, pulido y demo de fase | 1–2 sem | Todos los anteriores |

Camino crítico: **S4.1 → S4.2 → S4.3 → S4.4** habilita el bucle mínimo demostrable. S4.5–S4.7 construyen el estatus visible. S4.8 añade el alma (rival). S4.9 cierra.

---

## OSIA-S4.1 — Fundaciones de dominio y app independiente

**Objetivo:** Sentar las bases sin lógica de juego aún: las migraciones de `schema game` y `schema economy`, los enums/contratos en `packages/shared`, el scaffold de `apps/games` como app deep-linkable que consume el Pasaporte, y la nueva puerta en el catálogo del Vestíbulo. Al final de S4.1, abrir la puerta "Los Juegos" funciona (aunque la pantalla esté casi vacía).

**Duración estimada:** 2 semanas.

**Dependencias:** Fases 1–3 completas (Account/Profile, SSO/`packages/identity`, Vestíbulo `apps/web`, `apps/api` hexagonal con bounded contexts, social, world-server, Redis, Supabase).

### Historias

---

#### OSIA-S4.1-H1 — Migraciones de los schemas `game` y `economy`

**Como** Dev/Operador **quiero** crear las tablas de juego y economía en Postgres/Supabase con sus constraints e índices **para** tener la verdad durable del dominio de estatus desde el inicio.

**Criterios de aceptación:**
- Dado el estándar del ER (ver [../04-modelo-datos-er.md](../04-modelo-datos-er.md)), Cuando aplico las migraciones forward-only, Entonces existen en `schema game`: `games`, `match_sessions`, `scores`, `leaderboards`, `ranking_snapshots`, `achievements`, `account_achievements`.
- Y existen en `schema economy`: `cosmetics`, `inventory_items`, `reputation_ledger`, `transactions`.
- Y toda tabla de dominio tiene PK `uuidv7()`, `created_at`/`updated_at` timestamptz UTC, `deleted_at` (soft-delete) y trigger `set_updated_at`.
- Y catálogos (`games`, `cosmetics`, `achievements`, `leaderboards`) tienen columna `slug`/`code` natural única (no exponer volumen).
- Y `transactions.idempotency_key` es UNIQUE; `account_achievements` tiene UNIQUE `(account_id, achievement_id)`; `inventory_items` tiene UNIQUE `(account_id, cosmetic_id)` (uq_inventory_unique).
- Y `scores.is_verified boolean NOT NULL DEFAULT false` existe (anti-cheat).
- Y los CHECK de enums (`match_sessions.status`, `cosmetics.rarity`, `achievements.rarity` incluyendo `'celestial'`, `transactions.reason`) están presentes y reflejan los enums de `packages/shared`.

**Tareas técnicas:**
- [ ] Crear migración `YYYYMMDD__0001_game_core.sql` (Supabase CLI, forward-only) con `games`, `match_sessions`, `scores`, `leaderboards`, `ranking_snapshots`, `achievements`, `account_achievements`.
- [ ] Crear migración `YYYYMMDD__0001_economy_core.sql` con `cosmetics`, `inventory_items`, `reputation_ledger`, `transactions`.
- [ ] Añadir `reputation_ledger` como tabla append-only (sin UPDATE/DELETE en uso normal; `reason`, `delta`, `balance_after`, `ref_type`, `ref_id`).
- [ ] Añadir índices: `idx_scores_session`, `idx_scores_account_game`, `idx_match_sessions_game_status`, `idx_inventory_account`, `uq_ledger_idem` si aplica.
- [ ] Añadir FKs con `ON DELETE` apropiado (cascade para datos de usuario; restrict para catálogos).
- [ ] Registrar trigger `set_updated_at` por tabla nueva.
- [ ] Seeds idempotentes: 1 `game` (`slug='meteor-run'`), 1 `leaderboard` (`code='meteor-run-global'`), cosméticos/achievements base se siembran en sus sprints.
- [ ] Configurar `supabase db diff` en CI para detectar drift.

**DoD:** Migraciones aplican en local y staging sin error; `supabase db diff` limpio; rollback documentado; convención de nombres `<fecha>__<orden>_<contexto>.sql` respetada.

**Riesgos/notas:** No sobre-ingenierizar: `scores`/`match_sessions` como tablas simples (no particionar todavía). Mantener `account_achievements` y `inventory_items` con UNIQUE para idempotencia natural.

---

#### OSIA-S4.1-H2 — Enums y contratos de juego/economía en `packages/shared`

**Como** Dev **quiero** la fuente única de verdad de tipos, enums y catálogos de eventos para juego/economía **para** que cliente, apps/api y world-server no diverjan.

**Criterios de aceptación:**
- Dado que `packages/shared` es la única fuente de contratos (ver [../10-contratos-api-eventos.md](../10-contratos-api-eventos.md)), Cuando agrego el dominio de juego, Entonces existen en `domain/enums`: `MatchStatus` (`pending|active|finished|aborted`), `CosmeticRarity` (`common|rare|epic|legendary|celestial`), `AchievementRarity` (mismo set), `TransactionReason` (`rank_reward|achievement_reward|event_attendance|admin_grant|...`), `CosmeticSlot` (`aura|nameplate|trail|frame|...`).
- Y los enums espejan exactamente los CHECK del ER (test que lo valida).
- Y existen DTOs Zod en `schemas/`: `GameBrief`, `LeaderboardEntry`, `ScoreView`, `AchievementView`, `CosmeticView`, `InventoryItemView`, `BalanceView`.
- Y `catalog/events.ts` incluye `game.match.finished`, `game.score.recorded`, `game.rank.snapshotted`, `economy.cosmetic.equipped`, `economy.cosmetic.granted`, `achievement.unlocked` (formato `<contexto>.<entidad>.<accion_en_pasado>`).
- Y `catalog/experiences.ts` tiene una entrada para `games` lista para renderizar la puerta.

**Tareas técnicas:**
- [ ] Crear `domain/enums/game.ts` y `domain/enums/economy.ts`; re-exportar.
- [ ] Crear `schemas/game.ts` y `schemas/economy.ts` (Zod → `z.infer` para tipos).
- [ ] Añadir códigos de error a `errors.ts`: `GAME_NOT_FOUND`, `MATCH_NOT_ACTIVE`, `MATCH_ALREADY_FINISHED`, `SCORE_WRITE_FORBIDDEN`, `COSMETIC_NOT_OWNED`, `INSUFFICIENT_BALANCE`, `IDEMPOTENCY_CONFLICT`.
- [ ] Añadir constantes de catálogo (slugs/codes) compartidas.
- [ ] Test: cada enum coincide con los CHECK declarados (parseo de migración o tabla de referencia).

**DoD:** `@osia/shared` compila y exporta los nuevos contratos; el contract test de errores pasa; consumido sin error por un import de prueba en apps/api y apps/games.

---

#### OSIA-S4.1-H3 — Scaffold de `apps/games` deep-linkable con Pasaporte

**Como** Residente **quiero** abrir "Los Juegos" como app independiente con mi sesión OSIA ya iniciada **para** entrar directo sin volver a loguearme ni pasar por el Mundo.

**Criterios de aceptación:**
- Dado el modelo de constelación de apps (ver [../03-arquitectura-sistema.md](../03-arquitectura-sistema.md)), Cuando despliego `apps/games` en `games.osia.localhost`, Entonces carga con el design system OSIA (`packages/ui`, Italiana/Jost, dark-first) y consume `useOsiaSession()` de `packages/identity`.
- Dado que tengo sesión SSO en `.osia.localhost`, Cuando hago deep-link a `games.osia.localhost`, Entonces se hidrata el snapshot del Pasaporte sin re-login (cookie de dominio padre + refresh silencioso).
- Dado que NO tengo sesión, Cuando entro, Entonces se me redirige al flujo de auth del Vestíbulo y vuelvo a Los Juegos tras autenticarme.
- Y la app es bundle ligero (sin Three.js; el engine 3D solo se carga si la arena lo requiere, vía `import()` dinámico).

**Tareas técnicas:**
- [ ] Crear `apps/games` (Next.js App Router, TS) en el workspace pnpm/Turborepo.
- [ ] Integrar `packages/identity` (`OsiaIdentityClient`, `useOsiaSession`) y `packages/ui`.
- [ ] Configurar subdominio `games.osia.localhost` y CORS/allowlist en apps/api.
- [ ] Implementar guard de ruta: sin sesión → redirección a auth con `returnTo`.
- [ ] Layout base: header con Pasaporte mini, área de leaderboard (placeholder), botón "Jugar".
- [ ] Code splitting: marcar el engine de arena como import dinámico.

**DoD:** `pnpm dev` levanta apps/games; deep-link autenticado funciona en local con SSO de subdominios; sin engine 3D en el bundle inicial.

**Notas de rendimiento:** bundle objetivo del shell de Los Juegos <=250KB gzip (sin Three).

---

#### OSIA-S4.1-H4 — Puerta "Los Juegos" en el Vestíbulo

**Como** Residente **quiero** ver y cruzar una puerta elegante hacia Los Juegos desde el Vestíbulo **para** descubrir el ecosistema sin una grilla de iconos.

**Criterios de aceptación:**
- Dado el catálogo declarativo de experiencias, Cuando registro `{id:'games', nombre:'Los Juegos', dominio:'games.osia.com', estado:'live', fase:4}`, Entonces aparece una nueva `ExperienceThreshold` (constelación/puerta) en el Vestíbulo, NO un icono de grilla.
- Y la puerta usa la `ThresholdTransition` cinematográfica (fade de marca) al cruzar, instrumentada como evento de experiencia.
- Y la puerta respeta `prefers-reduced-motion` y el contrato `--atmo-tint`.

**Tareas técnicas:**
- [ ] Añadir entrada de `games` a `packages/shared/catalog/experiences.ts`.
- [ ] Renderizar la puerta en apps/web a partir del catálogo (sin tocar las otras puertas).
- [ ] Cablear deep-link autenticado al cruzar (handoff de sesión).
- [ ] Instrumentar evento `vestibule.threshold.crossed` con `experienceId='games'`.

**DoD:** la puerta aparece en el Vestíbulo, cruza con transición de marca a `apps/games` con sesión intacta; agregar la app fue aditivo (no rompió otras puertas).

---

## OSIA-S4.2 — Framework de juego server-authoritative

**Objetivo:** Construir el motor de dominio genérico Game → MatchSession → Score en `apps/api` (bounded context `games`, hexagonal) y en world-server, con la regla de oro: **el cliente propone, el servidor dispone**. No hay escritura de score desde el cliente. Reutilizable por cualquier minijuego futuro.

**Duración estimada:** 2 semanas.

**Dependencias:** S4.1.

### Historias

---

#### OSIA-S4.2-H1 — Bounded context `games` en apps/api (hexagonal)

**Como** Dev **quiero** un módulo Nest hexagonal `games` con domain/application/infrastructure **para** mantener la coherencia con los microservicios hexagonales y aislar adapters.

**Criterios de aceptación:**
- Dado el patrón hexagonal (espejo de `umas-*-service`), Cuando creo el módulo `games`, Entonces tiene `domain/` (entidades Game, MatchSession, Score, value objects), `application/` (casos de uso, ports in/out) e `infrastructure/` (adapters Supabase, Redis).
- Y los adapters de persistencia (Supabase) y cache (Redis) solo viven en `infrastructure`.
- Y existen casos de uso: `CreateMatchSession`, `StartMatch`, `FinishMatch`, `RecordScore` (interno), `GetGameCatalog`.

**Tareas técnicas:**
- [ ] Crear `apps/api/src/games/` con la estructura hexagonal y ports `MatchRepositoryPort`, `ScoreRepositoryPort`, `LeaderboardPort`.
- [ ] Implementar adapters Supabase para match/score y un adapter Redis (placeholder de leaderboard, se completa en S4.4).
- [ ] Mapear DTOs ↔ entidades en `infrastructure/web/mapper` (snake_case interno, camelCase en JSON).
- [ ] Pipe de validación Zod global aplicado.

**DoD:** módulo cargado por NestJS; casos de uso testeados con repos en memoria; sin lógica de DB en application/domain.

---

#### OSIA-S4.2-H2 — Ciclo de vida de la partida (MatchSession)

**Como** Residente **quiero** iniciar y terminar una partida con un ciclo de vida claro **para** que el sistema sepa cuándo se cuenta mi desempeño.

**Criterios de aceptación:**
- Dado un `Game` válido, Cuando solicito iniciar una partida (`POST /v1/games/{slug}/matches`), Entonces se crea una `MatchSession` con `status='pending'` y participantes, devolviendo su id.
- Cuando el world-server confirma el arranque, Entonces pasa a `status='active'` con `started_at`.
- Cuando termina la ventana o el world-server emite cierre, Entonces pasa a `status='finished'` con `ended_at`, y queda inmutable.
- Y transiciones inválidas (terminar una `pending`, reiniciar una `finished`) devuelven `MATCH_NOT_ACTIVE`/`MATCH_ALREADY_FINISHED`.
- Y existe `status='aborted'` para desconexiones/cancelaciones (no genera score verificado).

**Tareas técnicas:**
- [ ] Modelar la máquina de estados en el dominio (`pending→active→finished|aborted`).
- [ ] Endpoint `POST /v1/games/{slug}/matches` (Bearer JWT) que crea la sesión.
- [ ] Mensaje/RPC interno world-server → apps/api para `markActive` y `markFinished` (autenticado server-to-server, no cliente).
- [ ] Rate-limit Redis `rl:game:start:{account}` para evitar spam de inicios.
- [ ] Tests de transición de estados.

**DoD:** se puede crear, activar y finalizar una MatchSession por las vías correctas; transiciones inválidas rechazadas; rate-limit activo.

**Notas de seguridad:** el inicio lo pide el cliente; la activación/cierre los confirma el servidor autoritativo. El cliente nunca declara "terminé con score X".

---

#### OSIA-S4.2-H3 — Escritura de Score solo server-side (anti-cheat por contrato)

**Como** Sistema **quiero** que el score se calcule y persista exclusivamente en el servidor **para** que el ranking sea inviolable por diseño.

**Criterios de aceptación:**
- Dado el contrato de API (ver [../10-contratos-api-eventos.md](../10-contratos-api-eventos.md)), Cuando reviso la superficie REST pública, Entonces **NO existe** `POST /scores` ni ningún endpoint que acepte puntos desde el cliente.
- Cuando el cliente lee rankings/scores, Entonces solo hay endpoints de lectura (`GET /v1/games/{slug}/leaderboard`, `/scores/me`).
- Cuando el world-server finaliza una partida, Entonces invoca el caso de uso interno `RecordScore` con el valor calculado server-side y `is_verified=true`.
- Y un intento de fabricar score vía API pública es imposible (ruta inexistente) o, si llega por una vía indebida, se rechaza con `SCORE_WRITE_FORBIDDEN`.
- Y cada `Score` referencia su `MatchSession` y se valida que la sesión esté `finished`.

**Tareas técnicas:**
- [ ] Caso de uso `RecordScore` (port out al repo de scores) invocable solo desde el adapter server-to-server / world-server, no expuesto en controller público.
- [ ] Guard que rechaza cualquier escritura de score con origen "cliente".
- [ ] Emitir evento de dominio `game.score.recorded`.
- [ ] Tests: leaderboard y balance son de solo lectura para el cliente; la escritura de score requiere contexto de servidor.
- [ ] Documentar el contrato (anti-cheat por contrato) en `contratos/`.

**DoD:** no existe ruta pública de escritura de score; world-server puede registrar scores verificados; tests confirman la asimetría lectura/escritura.

**Notas de seguridad:** este es el núcleo del anti-cheat (ver [../09-seguridad-infra-costos.md](../09-seguridad-infra-costos.md)): autoridad de servidor, no ofuscación de cliente.

---

## OSIA-S4.3 — Minijuego "Cosecha de Meteoros"

**Objetivo:** Implementar el primer minijuego concreto, coherente con el mundo a pie + atmósfera: una **ventana cronometrada de Cosecha de Meteoros** dentro de una arena/instancia del Mundo, donde los jugadores recogen fragmentos de luz a pie. El scoring es **determinista y server-authoritative**: el cliente envía inputs/movimiento (nunca posiciones de score), el servidor cuenta las recolecciones válidas.

**Duración estimada:** 2 semanas.

**Dependencias:** S4.2, world-server con tick fijo/AOI (Fase 0/5-realtime), motor de atmósfera (Fase 2/6).

### Historias

---

#### OSIA-S4.3-H1 — Diseño y arena de Cosecha de Meteoros

**Como** Residente **quiero** una arena diegética bella donde caen fragmentos de luz **para** sentir que el juego es parte del mundo, no una pantalla aparte.

**Criterios de aceptación:**
- Dada la estética low-poly + atmósfera celestial, Cuando entro a la arena de Meteor Run, Entonces es una instancia/room del Mundo (tipo `zone` o arena dedicada) con su `AtmosphereState` (preferible `twilight-champagne`/`starlit-night`).
- Y los fragmentos de luz son props instanciados (`InstancedMesh`) que aparecen en puntos sembrados deterministamente por seed.
- Y la arena respeta presupuestos de rendimiento (draw calls, niebla, LOD) de [../08-estrategia-rendimiento.md](../08-estrategia-rendimiento.md).
- Y el cruce a la arena usa un Portal (leave+join orquestado) si viene desde el Mundo, o carga directa si viene deep-link desde Los Juegos.

**Tareas técnicas:**
- [ ] Definir room type `arena` (o reutilizar `zone`) en world-server con capacidad acorde (2–12).
- [ ] Sembrar spawns de fragmentos con PRNG sembrado (mismo seed cliente/servidor) — nada de `Math.random`.
- [ ] Render de fragmentos con InstancedMesh + glow ligado al motor de atmósfera (`--atmo-glow`).
- [ ] Cargar el engine de arena vía import dinámico desde apps/games.
- [ ] Manifiesto de assets de la arena en `packages/assets` (KTX2/Meshopt/LOD).

**DoD:** la arena carga, muestra fragmentos instanciados bajo atmósfera; rendimiento dentro de presupuesto; dispose limpio al salir (test de fugas entrar/salir 20 veces).

---

#### OSIA-S4.3-H2 — Bucle de recolección server-authoritative

**Como** Residente **quiero** recoger fragmentos caminando hacia ellos **para** acumular score durante la ventana.

**Criterios de aceptación:**
- Dado el modelo de inputs (ver [../05-realtime-mundo-networking.md](../05-realtime-mundo-networking.md)), Cuando me muevo, Entonces el cliente envía solo INPUTS numerados (no posiciones); el servidor simula mi cápsula (Rapier kinematic) con predicción/reconciliación.
- Cuando mi avatar entra en el radio de un fragmento, Entonces el **servidor** valida la cercanía (clamp de velocidad/teleport) y cuenta la recolección, marcando el fragmento como tomado para todos.
- Y un cliente que reclama recoger un fragmento lejano/inexistente es ignorado por el servidor (validación de cercanía).
- Y el conteo de fragmentos del jugador vive en el estado autoritativo de la partida, no en el cliente.
- Y se difunde a la sala qué fragmentos quedan tomados (delta por tick, AOI).

**Tareas técnicas:**
- [ ] Añadir mensaje de interacción de recolección (reutilizar `INTERACT 0x07` o sub-tipo) C→S.
- [ ] Lógica server-side: validar cercanía con la posición autoritativa, marcar fragmento, incrementar contador del jugador.
- [ ] Anti-cheat: clamp de velocidad, rechazo de recolecciones imposibles, rate-limit de interacciones.
- [ ] Difundir estado de fragmentos por delta con AOI; object pooling para no asignar por frame.
- [ ] Cliente: feedback visual/sonoro al recoger (SFX `--sfx-reveal`), pero el conteo mostrado se reconcilia con el servidor.

**DoD:** dos clientes recogen fragmentos en la misma arena; el servidor cuenta correctamente; recolecciones tramposas rechazadas; bytes/tick dentro de presupuesto.

**Notas de seguridad/rendimiento:** la posición es autoritativa del servidor; ningún conteo confía en el cliente. Delta compression + AOI para no exceder ~1.5 KB/jugador/tick.

---

#### OSIA-S4.3-H3 — Ventana cronometrada y cálculo final de score determinista

**Como** Residente **quiero** que la partida tenga una ventana clara y un score final justo **para** competir con reglas iguales para todos.

**Criterios de aceptación:**
- Dado el reloj autoritativo del Mundo, Cuando inicia Meteor Run, Entonces hay una ventana fija (p.ej. 90s) sincronizada para todos (PING/PONG, mismo `worldClock`).
- Cuando termina la ventana, Entonces el servidor calcula el score final por jugador con una fórmula **determinista y documentada** (p.ej. `fragmentos*base + bonus_racha + bonus_evento_raro`), sin aleatoriedad oculta.
- Y el servidor marca la `MatchSession` como `finished` e invoca `RecordScore` con `is_verified=true` para cada participante.
- Y existe un test que, dada la misma secuencia de eventos de partida, produce siempre el mismo score (determinismo).
- Y si ocurre un `AtmosphereEvent` raro (lluvia de meteoros) durante la ventana, otorga un multiplicador/bonus documentado (FOMO jugable).

**Tareas técnicas:**
- [ ] Implementar temporizador de ventana en el bucle de instancia (acumulador de tick fijo).
- [ ] Función pura `computeMeteorScore(events)` testeable, sin I/O.
- [ ] Conectar fin de ventana → `markFinished` + `RecordScore` (S4.2).
- [ ] Integrar bonus por `AtmosphereEvent` activo (consultar estado de atmósfera del world-server).
- [ ] Tests de determinismo y de bonus de evento.

**DoD:** una partida completa de extremo a extremo produce scores verificados deterministas; el bonus de evento raro funciona; tests verdes.

---

## OSIA-S4.4 — Leaderboard global y RankingSnapshot

**Objetivo:** Materializar el prestigio: leaderboard en vivo (Redis ZSET) para lectura de baja latencia, y `RankingSnapshot` durable en Postgres al cierre de cada temporada/ventana, con un job que reparte premios. Concepto de temporada para que el estatus se renueve.

**Duración estimada:** 1–2 semanas.

**Dependencias:** S4.2, S4.3.

### Historias

---

#### OSIA-S4.4-H1 — Leaderboard en vivo (Redis ZSET)

**Como** Residente **quiero** ver el ranking actualizarse en vivo **para** saber dónde estoy frente a mis amigos.

**Criterios de aceptación:**
- Dada la frontera Postgres/Redis (ver [../04-modelo-datos-er.md](../04-modelo-datos-er.md)), Cuando se registra un `Score` verificado, Entonces se actualiza un ZSET Redis `lb:{leaderboard_code}` con `(accountId, bestScore)`.
- Cuando consulto `GET /v1/games/{slug}/leaderboard`, Entonces obtengo top-N y mi posición (`/me`) leídos de Redis con paginación.
- Y el leaderboard guarda el **mejor** score por cuenta (no acumulado), salvo que el diseño del juego diga otra cosa (documentado).
- Y la lectura es solo lectura para el cliente (sin escritura).

**Tareas técnicas:**
- [ ] Al `RecordScore`, hacer `ZADD lb:{code}` con la política "mejor score" (GT).
- [ ] Endpoints `GET /v1/games/{slug}/leaderboard` y `/leaderboard/me` con `ProfileBrief` enriquecido.
- [ ] Cache de perfiles para enriquecer entradas (handle, avatar, cosmético equipado) sin N+1.
- [ ] Invalidación/refresco coherente con el snapshot al cierre.

**DoD:** leaderboard responde rápido desde Redis; refleja nuevos scores al instante; lectura pública, escritura server-only.

---

#### OSIA-S4.4-H2 — Temporadas y RankingSnapshot durable

**Como** Anfitrión/Operador **quiero** cerrar temporadas y congelar el ranking **para** premiar y dar memoria histórica al prestigio.

**Criterios de aceptación:**
- Dado un calendario de temporadas (p.ej. semanal/quincenal), Cuando una temporada cierra, Entonces un job materializa un `RankingSnapshot` durable en Postgres con las posiciones finales leídas del ZSET.
- Y el snapshot es inmutable (event-sourced histórico del estatus).
- Y tras el snapshot, se dispara el reparto de premios (cosméticos/reputación) a las posiciones premiadas (S4.5/S4.6).
- Y existe lectura de snapshots históricos por temporada.

**Tareas técnicas:**
- [ ] Modelar `ranking_snapshots` (temporada, leaderboard, posiciones, score, accountId).
- [ ] Job/cron de cierre de temporada (CronCreate o scheduler de apps/api) que lee ZSET → escribe snapshot.
- [ ] Emitir evento `game.rank.snapshotted` que dispara reparto de premios.
- [ ] Endpoint de lectura de snapshots históricos.
- [ ] Idempotencia del cierre (no duplicar snapshot si el job corre dos veces).

**DoD:** el cierre de temporada produce un snapshot durable e inmutable; los premios se disparan; el job es idempotente.

**Notas:** definir la duración real de temporada validando que dos amigos compitan en ventanas frecuentes (alineado al ritmo de eventos del motor de atmósfera).

---

## OSIA-S4.5 — Achievements (logros)

**Objetivo:** Definir y otorgar logros server-side con rareza, incluido el tier `celestial` reservado a hazañas excepcionales (p.ej. testigo/campeón de la lluvia de meteoros). Los logros son verificables, no falsificables y visibles en el Pasaporte.

**Duración estimada:** 1–2 semanas.

**Dependencias:** S4.2, S4.4.

### Historias

---

#### OSIA-S4.5-H1 — Catálogo de logros con rareza

**Como** Dev **quiero** un catálogo de logros con `slug`/rareza/criterio **para** definir qué hazañas otorgan estatus.

**Criterios de aceptación:**
- Dado el ER, Cuando siembro `achievements`, Entonces existen >=5 logros con `slug`, `name`, `rarity` (incluyendo al menos 1 `celestial`), `description` y un criterio declarativo.
- Y al menos un logro `celestial` está ligado al `AtmosphereEvent` de lluvia de meteoros (rastro persistente del evento efímero, sin romper su efimeridad).
- Y los logros se muestran con copy y estética de marca.

**Tareas técnicas:**
- [ ] Seed idempotente de logros (p.ej. "Primera Cosecha", "Cazador de Luz x100", "Campeón de Temporada", "Testigo de la Lluvia de Meteoros" [celestial], "Imbatible 3 temporadas").
- [ ] Definir un esquema de criterio (evento + umbral) interpretable por el evaluador.
- [ ] Vistas `AchievementView` en shared.

**DoD:** catálogo sembrado; rareza `celestial` presente; criterios definidos.

---

#### OSIA-S4.5-H2 — Otorgamiento y verificación server-side

**Como** Residente **quiero** que mis logros se desbloqueen automáticamente al cumplir la hazaña **para** que el estatus sea real y no reclamable a mano.

**Criterios de aceptación:**
- Dado un evento de dominio (`game.score.recorded`, `game.rank.snapshotted`, `atmosphere.event.started`/asistencia), Cuando se cumple el criterio de un logro, Entonces el servidor inserta `account_achievements (account_id, achievement_id)` (UNIQUE evita duplicados) y emite `achievement.unlocked`.
- Y NO existe endpoint para que el cliente se auto-otorgue un logro.
- Y el logro celestial de lluvia de meteoros requiere registro de asistencia verificado (estuvo en la sala durante el evento).
- Y el borrado de cuenta purga `account_achievements` en cascada.

**Tareas técnicas:**
- [ ] Evaluador de logros suscrito a eventos de dominio (juego/atmósfera/social si aplica).
- [ ] Insert idempotente vía UNIQUE; emitir `achievement.unlocked`.
- [ ] Conectar reparto de cosmético/reputación asociado al logro (S4.6).
- [ ] Endpoint de lectura `GET /v1/profiles/me/achievements` (solo lectura).
- [ ] Tests: doble disparo no duplica; logro celestial requiere asistencia.

**DoD:** logros se desbloquean automáticamente y de forma idempotente; sin auto-otorgamiento por cliente; purga en borrado de cuenta.

---

## OSIA-S4.6 — Economía cosmética v1

**Objetivo:** Entregar la economía cosmética sin pay-to-win y sin dinero real: `Cosmetic` (catálogo en paleta de marca), `InventoryItem` (propiedad), `Transaction(virtual)` (otorgamientos idempotentes) y `ReputationLedger` (append-only, fuente de verdad de puntos). Definir **cómo se ganan** (ranking, logros, asistencia a eventos) y **cómo se equipan**.

**Duración estimada:** 2 semanas.

**Dependencias:** S4.4, S4.5.

### Historias

---

#### OSIA-S4.6-H1 — Catálogo de cosméticos y ReputationLedger

**Como** Dev **quiero** un catálogo de cosméticos de marca y un ledger de reputación **para** tener la base económica del estatus.

**Criterios de aceptación:**
- Dada la paleta de marca, Cuando siembro `cosmetics`, Entonces existen >=6 cosméticos (auras, nameplates, trails, frames) en champán/ónix/marfil/taupe, con `slot`, `rarity` (incl. `celestial`) y `code`.
- Y `reputation_ledger` es append-only (event-sourced): cada cambio de puntos es una fila con `reason`, `delta`, `balance_after`, `ref`.
- Y `profiles.popularity_points`/`reputation` es cache derivado del ledger (recalculado por trigger), no la fuente de verdad.
- Y `cosmetics.rarity` incluye `celestial` para premios excepcionales.

**Tareas técnicas:**
- [ ] Seed idempotente de cosméticos con assets de marca (manifiesto en packages/assets para los visuales in-world).
- [ ] Implementar `reputation_ledger` append-only + trigger de recálculo de cache en `profiles`.
- [ ] Vistas `CosmeticView`/`BalanceView` en shared.
- [ ] Endpoints lectura `GET /v1/cosmetics` y `GET /v1/economy/balance|ledger` (solo lectura cliente).

**DoD:** catálogo sembrado en paleta; ledger append-only funcionando; cache de reputación coherente; lectura pública, escritura server-side.

---

#### OSIA-S4.6-H2 — Cómo se ganan: otorgamiento por ranking/logros/asistencia

**Como** Residente **quiero** ganar cosméticos y reputación por mis hazañas (no comprándolos) **para** que el estatus sea mérito, no billetera.

**Criterios de aceptación:**
- Dado el cierre de temporada (`game.rank.snapshotted`), Cuando quedo en posición premiada, Entonces se otorga el cosmético/reputación correspondiente vía `Transaction(virtual)` idempotente (`idempotency_key` por (temporada, cuenta, premio)).
- Dado `achievement.unlocked`, Cuando desbloqueo un logro con recompensa, Entonces se otorga su cosmético/reputación de forma idempotente.
- Dada la asistencia a un `AtmosphereEvent` raro, Cuando estuve presente (verificado), Entonces recibo el cosmético de asistencia (escaso, no comprable ni grindeable).
- Y los otorgamientos crean `inventory_items` (UNIQUE evita duplicados) y registran el `reputation_ledger`.
- Y **ningún** otorgamiento es accesible vía escritura de cliente.

**Tareas técnicas:**
- [ ] Caso de uso `GrantCosmetic`/`GrantReputation` server-side, conectado a eventos de dominio.
- [ ] Idempotencia mediante `transactions.idempotency_key` UNIQUE.
- [ ] Insert en `inventory_items` (UNIQUE) + fila en `reputation_ledger`.
- [ ] Emitir `economy.cosmetic.granted`.
- [ ] Tests: doble evento no duplica inventario ni puntos.

**DoD:** premios de ranking, logros y asistencia otorgan cosméticos/reputación idempotentemente; sin vía de cliente; inventario y ledger consistentes.

**Notas de diseño:** el cosmético de asistencia a eventos es escasez por diseño (FOMO); no se compra ni se grindea — alineado a [../01-pilares-experiencia.md](../01-pilares-experiencia.md).

---

#### OSIA-S4.6-H3 — Cómo se equipan: equip/unequip y propagación al Pasaporte

**Como** Residente **quiero** equipar y desequipar cosméticos que poseo **para** mostrar mi estatus en todas las apps.

**Criterios de aceptación:**
- Dado que poseo un cosmético, Cuando hago `POST .../equip`, Entonces se marca equipado en su `slot` (uno por slot), y el snapshot del Pasaporte refleja el cambio.
- Cuando equipo un cosmético que NO poseo, Entonces se rechaza con `COSMETIC_NOT_OWNED`.
- Y equip/unequip es idempotente y limitado por rate-limit Redis (`rl:equip:{account}`).
- Y el cosmético equipado se incluye en el `Passport` devuelto por `GET /v1/auth/session` (viaja por SSO).
- Y emite `economy.cosmetic.equipped`.

**Tareas técnicas:**
- [ ] Endpoints `POST /v1/inventory/{id}/equip` y `/unequip` (Bearer JWT, valida propiedad).
- [ ] Persistir `equipped` por slot; un solo equipado por slot (constraint/lógica).
- [ ] Extender el snapshot del Pasaporte (`packages/identity`) con `equippedCosmetics`.
- [ ] Rate-limit Redis para equip.
- [ ] Tests: equip de no-poseído rechazado; un solo equipado por slot.

**DoD:** equip/unequip funciona, valida propiedad, viaja en el Pasaporte; sin pay-to-win (equipar no afecta score).

---

## OSIA-S4.7 — Vitrina de estatus y propagación cross-app

**Objetivo:** Hacer el estatus **mostrable**: una superficie del Pasaporte que muestra rango, mejor score, trofeos de temporada, logros y cosméticos equipados; y propagar el cosmético equipado a El Mundo (nameplate/aura) y a La Red Social (ProfileHeader/FeedItem). El estatus se vuelve visible donde el usuario ya está.

**Duración estimada:** 1–2 semanas.

**Dependencias:** S4.6.

### Historias

---

#### OSIA-S4.7-H1 — Vitrina de estatus en el Pasaporte

**Como** Residente **quiero** una vitrina elegante de mis logros y rango en mi Pasaporte **para** ver y exhibir mi prestigio.

**Criterios de aceptación:**
- Dado el design system OSIA, Cuando abro mi Pasaporte (apps/web o el mini-Pasaporte en apps/games), Entonces veo: rango actual (de leaderboard/snapshot), mejor score, trofeos de temporada (de `ranking_snapshots`), logros (con rareza, `celestial` destacado) y cosméticos equipados.
- Y la vitrina usa componentes de marca (`Leaderboard`, `Badge`, `ProfileHeader`, `PopularityMeter`) con contención de lujo (espacio negativo, champán escaso).
- Y respeta dark-first, contraste AA, `prefers-reduced-motion`.

**Tareas técnicas:**
- [ ] Componentes de vitrina en `packages/ui` (o consumidos): tabla de logros, trofeos, rango.
- [ ] Datos vía TanStack Query a endpoints de lectura (`/profiles/me/achievements`, `/leaderboard/me`, snapshots, balance).
- [ ] Integrar en el Pasaporte del Vestíbulo y en el header de Los Juegos.
- [ ] Test de contraste en CI para las nuevas combinaciones.

**DoD:** la vitrina muestra rango/score/trofeos/logros/cosméticos con estética de marca y accesibilidad verificada.

---

#### OSIA-S4.7-H2 — Propagación del cosmético equipado a El Mundo y La Red Social

**Como** Residente **quiero** que mi cosmético equipado se vea en el Mundo y en la Red Social **para** que mi estatus sea visible donde sea que esté.

**Criterios de aceptación:**
- Dado que el cosmético equipado viaja en el Pasaporte, Cuando estoy en El Mundo, Entonces mi Nameplate/aura refleja el cosmético equipado (HUD diegético que "respira el cielo").
- Cuando aparezco en La Red Social, Entonces mi `ProfileHeader`/`FeedItem` muestra el cosmético/trofeo equipado.
- Y la propagación es por lectura del snapshot del Pasaporte (sin acoplar las apps entre sí más allá de la identidad compartida).

**Tareas técnicas:**
- [ ] world-client: leer `equippedCosmetics` del Pasaporte y aplicar al Nameplate/aura (contrato `--atmo-tint/--atmo-glow`).
- [ ] apps/social: enriquecer ProfileHeader/FeedItem con cosmético/trofeo.
- [ ] Asegurar que el cambio de equip se refleje tras refresh de sesión/presencia.

**DoD:** equipar un aura se ve en el Mundo y en la Red Social; el acoplamiento es solo vía Pasaporte; sin romper rendimiento del HUD.

---

## OSIA-S4.8 — Rival de IA conectado al ranking

**Objetivo:** Darle alma competitiva: un Habitante de IA "rival" (persona nombrada, p.ej. "El Cronista del Cielo") que comenta el ranking, lanza un chizo pre-partida barato (Haiku) y tiene un cara a cara de momento clave (Opus) tras una partida memorable — todo dentro de los guardarraíles de costo de Fase 2. Extiende el pipeline de habitantes a Los Juegos.

**Duración estimada:** 1–2 semanas.

**Dependencias:** S4.3, S4.4, pipeline IA de Fase 2 (ver [../07-habitantes-ia.md](../07-habitantes-ia.md)).

### Historias

---

#### OSIA-S4.8-H1 — Persona "Rival" y conexión al ranking

**Como** Residente **quiero** un rival con personalidad que conozca el ranking **para** que la competencia tenga narrativa y no solo números.

**Criterios de aceptación:**
- Dada la anatomía de Inhabitant (ver [../07-habitantes-ia.md](../07-habitantes-ia.md)), Cuando defino la persona rival, Entonces tiene `InhabitantPersona` versionada (rol `rival de juego`, biografía, voice_rules, boundaries, voz TTS, líneas de fallback por mood).
- Y el rival recibe en su `worldSnapshot`/contexto los datos relevantes del ranking (Score/Leaderboard del usuario) desde la verdad autoritativa, nunca inventados.
- Y el rival vive en `apps/api` (servicio de IA); world-server/apps/games solo disparan el trigger y difunden.

**Tareas técnicas:**
- [ ] Escribir `InhabitantPersona` "Rival del Cielo" (voice_rules, boundaries, 10–20 fallbacks por mood).
- [ ] Inyectar contexto de ranking (posición del usuario, líder, brecha) al ensamblar el prompt (en `messages`, nunca en `system`).
- [ ] Definir triggers: pre-partida (chisme/chizo), post-partida memorable (cara a cara).
- [ ] Cablear difusión del diálogo (subtítulo + audio) a apps/games / arena.

**DoD:** la persona rival existe, conoce el ranking real, y comenta vía el pipeline de IA (no datos inventados).

---

#### OSIA-S4.8-H2 — Tiering Haiku/Opus, presupuesto y fallback

**Como** Dev/Operador **quiero** que el rival use el modelo correcto al costo correcto **para** que el alma competitiva no rompa el runway.

**Criterios de aceptación:**
- Dado el tiering de modelos, Cuando el rival hace chisme pre-partida/relleno, Entonces usa `claude-haiku-4-5` (barato), respuestas cortas (max_tokens bajo ~220, contención de lujo).
- Cuando ocurre un **momento clave** (cara a cara tras una partida memorable, p.ej. nuevo #1 o derrota cerrada), Entonces usa `claude-opus-4-8` (modelo de momentos clave).
- Y se respetan los guardarraíles: prompt-cache en el prefijo estable, rate-limit por usuario+global (Redis), presupuesto diario de tokens (80% fuerza Haiku, 100% activa modo offline), kill-switch global de IA.
- Cuando se agota presupuesto o falla STT/Claude/TTS, Entonces se sirve una **línea de fallback offline** pre-escrita coherente con el mood/atmósfera.
- Y se audita cada turno con `request_id` de Anthropic en `AuditLog`.

**Tareas técnicas:**
- [ ] Implementar `pickModel(ctx)`: Haiku por defecto, Opus en momento clave (selección por tipo de interacción).
- [ ] Integrar prompt caching (`cache_control` ephemeral en el prefijo estable: reglas + persona + formato) y verificar `cache_read_input_tokens > 0`.
- [ ] Token buckets Redis (`rl:ai:turn:{account}` y global) + contador de presupuesto (`budget:ai:*`) con umbrales 80%/100%.
- [ ] Fallback offline por triggers (rate-limit, presupuesto, error/timeout, `stop_reason: refusal`).
- [ ] Streaming de la respuesta (primer token <1s en Haiku) + TTS; sanitizar salida antes de TTS.
- [ ] AuditLog con `request_id`.

**DoD:** el rival usa Haiku en charla y Opus solo en momentos clave; presupuesto/kill-switch activos; fallback offline funciona; turnos auditados. (Modelos confirmados vía la referencia de la API de Claude: `claude-haiku-4-5` para charla/relleno, `claude-opus-4-8` para el cara a cara de momento clave.)

**Notas de seguridad:** input de usuario nunca entra al `system` prompt; manejar `stop_reason='refusal'` con fallback elegante en personaje; system prompt blindado por persona (moderación 4 capas de Fase 2).

---

## OSIA-S4.9 — Endurecimiento, balance y demo de fase

**Objetivo:** Cerrar la fase: anti-cheat profundo, RLS y rate-limits completos, observabilidad, balance del juego/economía, pulido de UX/sonido/motion, e instrumentación de métricas. Dejar la fase **lanzable** con la demo guion del §1.4.

**Duración estimada:** 1–2 semanas.

**Dependencias:** todos los sprints anteriores.

### Historias

---

#### OSIA-S4.9-H1 — RLS, rate-limits e idempotencia completos

**Como** Dev/Operador **quiero** defensa en profundidad sobre juego y economía **para** que el estatus sea inviolable y barato de operar.

**Criterios de aceptación:**
- Dado el modelo de seguridad (ver [../09-seguridad-infra-costos.md](../09-seguridad-infra-costos.md)), Cuando reviso `schema game` y `schema economy`, Entonces tienen RLS deny-all con políticas de ownership por `auth.uid()`; rankings/balance legibles por el cliente, escritura solo service-role.
- Y existen rate-limits Redis: `rl:game:start`, `rl:equip`, `rl:ai:turn` (rival), con Lua atómico.
- Y `transactions.idempotency_key` previene dobles otorgamientos; el cierre de temporada es idempotente.
- Y un contract test verifica que cada `code` emitido por apps/api existe en `ErrorCode` de shared.

**Tareas técnicas:**
- [ ] Escribir políticas RLS por tabla (game/economy) + tests de acceso.
- [ ] Asegurar rate-limit guards en endpoints de juego/equip; limitador in-process para interacciones de recolección en world-server.
- [ ] Verificar idempotencia de otorgamientos y de cierre de temporada.
- [ ] Contract test de errores en CI.

**DoD:** RLS deny-all activo; lectura pública/escritura server-side confirmada por test; rate-limits e idempotencia verificados; contract test verde.

---

#### OSIA-S4.9-H2 — Anti-cheat profundo y validación de partidas

**Como** Sistema **quiero** detectar y rechazar partidas/scores anómalos **para** proteger el prestigio del ranking.

**Criterios de aceptación:**
- Dado que el score es server-authoritative, Cuando una partida presenta señales imposibles (velocidad/teleport, recolecciones fuera de rango, tasa de inputs anómala), Entonces el servidor invalida o aborta sin registrar score verificado.
- Y existe validación de que el `Score` proviene de una `MatchSession` `finished` legítima con participación real (presencia en la sala durante la ventana).
- Y los mensajes binarios de partida se validan con Zod/schema antes de tocar la simulación.

**Tareas técnicas:**
- [ ] Reforzar clamps de movimiento/recolección; rate-limit de interacciones.
- [ ] Validar consistencia partida↔presencia↔score antes de `is_verified=true`.
- [ ] Validación de cada mensaje binario de partida (schema en packages/shared).
- [ ] Tests adversariales (cliente "tramposo" simulado).

**DoD:** scores fabricados/anómalos no llegan al leaderboard; partidas inválidas se abortan; tests adversariales pasan.

---

#### OSIA-S4.9-H3 — Balance, pulido (UX/sonido/motion) y observabilidad

**Como** Residente **quiero** que el juego se sienta justo, bello y pulido **para** que quiera volver a subir en el ranking.

**Criterios de aceptación:**
- Dado el design system y el sistema de sonido, Cuando juego, Entonces hay SFX/ambientes adecuados (recolección, fin de ventana, `--sfx-prestige` al subir de rango, `--amb-event-meteor` en evento), con ducking/cross-fade y motion contenido (sin bounce).
- Y la fórmula de score y los premios están balanceados para 2–3 jugadores (no trivial ni inalcanzable).
- Y hay observabilidad: logs Pino, Sentry en apps/games y world-server (rama de juego), contadores Prometheus (partidas iniciadas/terminadas, scores verificados, costo IA rival/sesión, rate-limit hits).
- Y alertas a Discord para anomalías (gasto IA rival, world-server arena caída, error rate).

**Tareas técnicas:**
- [ ] Conseguir/sintetizar SFX CC0 de juego y cablear a la capa de audio (Howler/WebAudio).
- [ ] Ajustar constantes de balance (base, bonus, premios) tras playtests.
- [ ] Integrar Sentry y contadores Prometheus para el dominio de juego.
- [ ] Configurar alertas Discord.

**DoD:** experiencia pulida (sonido/motion de marca), balance validado en playtest 2-jugadores, observabilidad y alertas activas.

---

#### OSIA-S4.9-H4 — Métricas de fase y demo lanzable

**Como** Dev/Operador **quiero** instrumentar las métricas de la fase y validar la demo guion **para** confirmar que el estatus es deseable y la fase es lanzable.

**Criterios de aceptación:**
- Dado el §1.4, Cuando ejecuto la demo guion con Carlos + 1 amigo en staging, Entonces se completa de extremo a extremo (puerta → partida → leaderboard → premios → rival → vitrina → propagación cross-app).
- Y están instrumentadas: partidas/sesión, % de Residentes que llegan al leaderboard, cosméticos equipados, costo IA rival/sesión, y la métrica cualitativa "quiero subir en el ranking".
- Y se cumplen los 11 puntos del Definition of Done de la fase (§1.3).

**Tareas técnicas:**
- [ ] Instrumentar eventos de producto (inicio/fin de partida, llegada a leaderboard, equip, diálogo de rival).
- [ ] Tablero/consulta de métricas de la fase.
- [ ] Ensayo de la demo guion en staging; checklist de DoD de fase.
- [ ] Puerta de decisión: ¿el estatus genera deseo de volver? (criterio go para Fase 5).

**DoD:** demo guion reproducible en staging; métricas instrumentadas; DoD de fase (§1.3) verificado punto por punto.

---

## 3. Riesgos transversales de la fase

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Anti-cheat insuficiente (cliente fabrica score) | Alto: rompe el prestigio | Score solo server-side por contrato (sin ruta de escritura); validación partida↔presencia; clamps; tests adversariales (S4.2, S4.9). |
| Costo de IA del rival se dispara | Medio: come runway | Tiering Haiku/Opus, presupuesto diario + kill-switch global, prompt-cache, max_tokens bajo, fallback offline (S4.8). |
| Pay-to-win accidental | Alto: rompe la ética del producto | Regla dura: cosméticos no afectan score; equipar es estético; sin compra con dinero real (anti-alcance). |
| Juego no se siente parte del mundo | Medio: pierde coherencia de marca | Arena diegética bajo motor de atmósfera, recorrido a pie, eventos raros como bonus jugable (S4.3). |
| Leaderboard incoherente (Redis vs Postgres) | Medio | ZSET en vivo + snapshot durable idempotente; refresco coherente al cierre (S4.4). |
| Estatus poco visible | Medio: no genera deseo | Propagación del cosmético al Pasaporte, Mundo y Red Social; vitrina (S4.7). |
| Solo 2-3 jugadores → ranking vacío/aburrido | Medio | Rival IA da competencia estructural; temporadas frecuentes; bonus de evento raro como gancho (S4.8, S4.4, S4.3). |
| Drift de migraciones/contratos | Bajo-medio | `supabase db diff` en CI, contract test de errores, enums espejo de CHECK (S4.1, S4.9). |

## 4. Notas de rendimiento y seguridad (resumen de fase)

- **Rendimiento:** la arena reutiliza la disciplina del Mundo (LOD, InstancedMesh para fragmentos, niebla, AOI, delta compression). El shell de Los Juegos no incluye Three.js (code splitting); el engine de arena se carga on-demand. Test de fugas (entrar/salir 20 veces, VRAM vuelve al baseline). Presupuesto de red de partida dentro de ~1.5 KB/jugador/tick.
- **Seguridad:** autoridad de servidor (score, posición, validación de cercanía); RLS deny-all en game/economy; lectura pública / escritura server-only; idempotencia en transactions y cierre de temporada; rate-limits Redis; guardarraíles e IA del rival bajo kill-switch; input de usuario nunca en system prompt; AuditLog con request_id de Anthropic.
- **Costo:** la fase añade costo principalmente por el rival IA (escala con engagement, acotado por presupuesto). Infra base sigue siendo Hetzner CX22 + free tiers; la economía cosmética prepara la monetización de Fase 5 que pagará servidores.
