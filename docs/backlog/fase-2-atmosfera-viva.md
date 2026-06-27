# Backlog — Sprint 2 (rediseñado): Atmósfera Viva, Sensorial y Cimientos

> **Este documento reemplaza a [fase-2-mundo-vivo.md](./fase-2-mundo-vivo.md) como el Sprint 2 ACTIVO.**
> Decisión de Carlos (2026-06): la **IA** (Habitantes, diálogo, voz, memoria, guardarrailes de costo)
> y los **eventos efímeros** (meteoros, aurora, FOMO) quedan **DIFERIDOS, no cancelados** — su diseño
> sigue íntegro en [fase-2-mundo-vivo.md](./fase-2-mundo-vivo.md) y se retomará cuando haya presupuesto
> de IA. | Estado: Borrador v2 (replanteado contra el código real) | Parte del paquete de diseño OSIA.

---

## 0. Estado de implementación (2026-06-26)

Implementadas las 9 historias (typecheck/lint/test verdes). Pendientes acotados y marcados abajo.

| # | Historia | Estado |
|---|---|---|
| **S2-A1** | El HUD respira el cielo | ✅ Hecho. Además se migró el HUD a un componente `Text` (`@osia/ui`) con scrim para legibilidad día/noche, y se atenuó el PerfHUD al estilo del panel de test. |
| **S2-A2** | Paisaje sonoro | ✅ Hecho (motor WebAudio sintetizado + ducking + toggle + i18n). **Punto de extensión** para audio propio en `apps/world-client/src/sound/ambientAssets.ts`. Falta: test de no-fuga en navegador (no hay entorno WebAudio en CI); migrar el texto de VoiceHUD/ChatPanel a `Text`. |
| **S2-A3** | Pulido visual | ✅ Parte técnica (smoothstep en partículas + linter de paleta de `weatherConfig` + docs). El **afinado fino sigue pendiente del ojo de Carlos** (recorrido bioma×hora×clima). |
| **S2-B1** | Estaciones como datos | ✅ Hecho. La estación se deriva del reloj (no viaja por el cable). Control de estación en el panel de test (tecla **b**). |
| **S2-B2** | Ciclo de clima | ✅ Hecho, con **cadencia escasa**: máx. 2 eventos por día de juego, cada uno de 2–5 min (decisión de Carlos, 2026-06-26). |
| **S2-B3** | Contrato versionado | ✅ Hecho (`ATMOSPHERE_CONTRACT_VERSION` + Zod en el codec). |
| **S2-B4** | Checkpoint del clima | ✅ Hecho (serialize/restore + migración + carga al arrancar). Valor bajo con un solo hub. |
| **S2-C1** | `/metrics` | ✅ Hecho (world-server). |
| **S2-C2** | Borrado de cuenta | ✅ Hecho con **confirmación por contraseña** (`DELETE /v1/accounts/me`), cascada transaccional, idempotente, revoca sesiones. **Diferido:** variante link-email de 24 h (necesita proveedor de email) y cron de retención (`@nestjs/schedule` + tabla `audit_logs`). |

> Decisiones tomadas en esta fase y registradas en [`CLAUDE.md`](../../CLAUDE.md): estación derivada
> del reloj (no por red); clima escaso (≤2 eventos/día, 2–5 min); borrado de cuenta por contraseña;
> regla nueva §2.1 «ni el texto es nativo» → componente `Text`.

---

## 1. Por qué este rediseño (v2)

La v1 de este doc se quedó corta: solo tenía las 3 HU de pulido de atmósfera. Carlos pidió
**reincorporar y rehacer** todo lo que el Sprint 2 original tenía y que NO se descartó explícitamente
— pero anclándolo al **código real**, no al backlog teórico. Tras analizar el código por área, el
Sprint 2 queda en **tres tracks**:

- **Track A — Cerrar la atmósfera sensorial:** lo que falta para que la atmósfera (ya construida) se
  sienta terminada — HUD que respira, sonido, pulido. *(pulir lo que quedó)*
- **Track B — Profundidad de atmósfera:** estaciones, un ciclo de clima más rico ("mejorar el ciclo"),
  el contrato versionado y la persistencia del cielo. *(reincorporados, re-dimensionados)*
- **Track C — Cimientos transversales (sin IA):** exponer métricas que ya se calculan, y el **borrado
  de cuenta + retención** (deuda de privacidad real, no es atmósfera pero no se puede perder).

> **Nota de honestidad:** esto **ya no es un mini-sprint de días**; es un sprint real de ~3 semanas
> (ver §8). Cada track es independiente y entregable por separado.

### 1.1 Lo que YA está hecho (verificado en código — no se re-hace)

| Pieza | Dónde |
|---|---|
| Clima **server-authoritative** determinista (PRNG mulberry32 sembrado) | `apps/world-server/src/weather.ts` (`WeatherDirector`) |
| Difusión `ATMOSPHERE_UPDATE` cada 2 s **solo en cambios** | `apps/world-server/src/loop.ts:76-87` |
| Cliente aplica el clima + **rampa suave** (la transición que gusta) | `apps/world-client/src/world/atmosphereRuntime.ts:68-83` |
| Resolución **pura** por hora + modulación de clima | `packages/atmosphere/src/resolve.ts`, `weather.ts` |
| **3 biomas** + ciclos de 11 keyframes (día/noche 20 min) | `packages/atmosphere/src/biomes.ts`, `presets.ts` |
| Render: height-fog TSL, SkyDome, SunMoon (**halo, no bloom**), Starfield, Precipitation, RainStreaks | `apps/world-client/src/world/*` |
| **Linter de house-palette** (existe; falta cablearlo a CI) | `packages/atmosphere/src/presetLint.test.ts` |
| Logging **Pino** (con redacción), **TickMetrics**, endpoint `/health` | `apps/world-server/src/{logger,metrics,http}.ts` |
| `health.controller` (liveness + readiness a Supabase) | `apps/api/src/health/health.controller.ts` |
| **Soft-delete** (`deleted_at`) + índices parciales + **RLS** + FK `ON DELETE CASCADE` | `supabase/migrations/20260623000002_identity_core.sql`, `..._rls.sql` |
| Acceso a Postgres desde world-server (pool de 4) | `apps/world-server/src/presence.ts` |
| Eventos efímeros: opcode `ATMOSPHERE_EVENT` existe pero **desactivado** | `loop.ts:77` |

---

## 2. Definition of Done de la fase

1. **Atmósfera sensorial cerrada:** el HUD se tiñe con el cielo en vivo; el mundo suena (ambiente por
   hora/clima con crossfade, opt-in); el look intacto y pulido en los 3 biomas.
2. **Atmósfera con más profundidad:** las estaciones avanzan (datos, deterministas, dentro de gamut);
   el ciclo de clima es más variado (rachas/rampas, sin romper la transición); el contrato de atmósfera
   está versionado y validado; el cielo se reanuda tras reinicio sin "saltar".
3. **Cimientos no-IA:** `/metrics` expone lo que ya se mide; el **borrado de cuenta en cascada** existe,
   es atómico, revoca sesiones, y hay política de retención.
4. **Calidad:** `pnpm typecheck/lint/test` verdes; i18n sin texto hardcodeado; accesibilidad
   (reduced-motion + opt-in de sonido); determinismo intacto (sin `Math.random` en `@osia/atmosphere`,
   lint activo); sin fugas de recursos; el linter de paleta corre en CI.

**Gate cualitativo:** baja el sol → el HUD se tiñe con el crepúsculo y el viento se vuelve grillos;
empieza a llover con una racha real (no un interruptor) → el ambiente cruza a lluvia y el HUD se apaga
un punto; reinicias el servidor y el cielo sigue donde estaba. Y puedes **borrar tu cuenta de verdad**.

---

## 3. Resumen de historias

| # | Historia | Track | Tamaño | Linaje |
|---|---|---|---|---|
| **S2-A1** | El HUD respira el cielo (`--atmo-*` runtime) | A | ~1 día | S2.3-H2 |
| **S2-A2** | Paisaje sonoro ambiente | A | ~2-3 días | S2.3-H2 |
| **S2-A3** | Pulido visual fino en los 3 biomas | A | variable | S2.2-H1 / S2.3-H2 |
| **S2-B1** | Estaciones como datos | B | ~2 días | S2.2-H2 |
| **S2-B2** | Ciclo de clima más rico | B | ~2 días | "mejorar el ciclo" |
| **S2-B3** | Contrato de atmósfera versionado en `@osia/shared` | B | ~0.5-1 día | S2.1-H3 |
| **S2-B4** | Persistencia/checkpoint del clima | B | ~1 día | S2.1-H2 / S2.9-H3 |
| **S2-C1** | Observabilidad: exponer `/metrics` (no-IA) | C | ~1 día | S2.9-H2 |
| **S2-C2** | Borrado de cuenta en cascada + retención | C | ~3-4 días | S2.9-H4 |

---

## 4. Track A — Cerrar la atmósfera sensorial

### S2-A1 — El HUD respira el cielo (runtime `--atmo-*`) · *(de S2.3-H2)*

**Como** Residente **quiero** que el HUD se tiña sutilmente con el cielo **para** que interfaz y mundo
se sientan un mismo aire.

**Criterios:**
- Las variables `--atmo-tint/glow/contrast` (hoy estáticas en `styles.css:162-165`) se actualizan en
  runtime desde `atmo.current`; el tinte se **clampa al gamut house-celestial** (no cualquier color).
- En niebla, los paneles suben un punto de opacidad; de noche, `--atmo-glow` baja. Sin re-render de
  React (se escribe por DOM), con **throttle** (cambio perceptible o ~200-300 ms), respetando
  `prefers-reduced-motion` (asigna directo, sin transición).
- Contraste legible (WCAG AA) en todos los estados (día/noche/lluvia/niebla).

**Tareas:**
- [ ] Runtime `atmoHudBus` que lee `atmo.current` y hace `style.setProperty('--atmo-*')` con throttle + diff.
- [ ] Mapeo `(skyHorizon, starsIntensity, fogDensity, exposure) → (tint, glow, contrast)` clampado a gamut (reusar `housePalette.ts`).
- [ ] Aplicar las vars en `Panel`/`Button`/`Field`/`HudPanel` de `@osia/ui`.
- [ ] Quitar el `AtmosphereTestPanel` del HUD de producción (queda tras flag de dev).

---

### S2-A2 — Paisaje sonoro ambiente · *(de S2.3-H2)*

**Como** Residente **quiero** oír el mundo (viento, grillos, lluvia) **para** que la atmósfera tenga
cuerpo, sin IA ni más usuarios.

**Criterios:**
- Motor de audio (WebAudio) **opt-in** (`ThemeProvider.soundEnabled` ya existe; nunca autoplay) con
  **capas** por hora/clima mezcladas según el `AtmosphereState` vigente.
- Cambios de hora/clima → **crossfade suave** (~800 ms), atado a `world.weather`/`worldClock.tod` (la
  misma verdad autoritativa). De noche el viento baja y suben los grillos; en lluvia/arena domina su capa.
- **Ducking** ante voz P2P activa (coordinar con `voice/MeshVoice`). Cero asignaciones por frame; nodos
  en setup; `dispose()` + cierre de `AudioContext` al desmontar (**test de no-fuga**, entrar/salir 20×).

**Tareas:**
- [ ] Motor `sound/` (idealmente `@osia/ui/sound` por §2.2; si pesa, nace en `world-client` y se extrae — anotado).
- [ ] Matriz de loops por bioma × {base, lluvia, nieve, arena, noche} (archivos cortos, livianos, pre-cargados).
- [ ] Mezclador con crossfade ligado al bus de atmósfera; ducking ante voz.
- [ ] Toggle de sonido en el HUD (reusar `Button` + `useTheme().setSoundEnabled`), i18n en/es.
- [ ] Test de no-fuga de audio.

> Es la **única feature nueva** del track A; lo demás es cablear/pulir.

---

### S2-A3 — Pulido visual fino en los 3 biomas · *(de S2.2-H1 / S2.3-H2)*

**Como** Residente **quiero** que cielo/niebla/partículas se vean impecables en los 3 biomas **para**
que el low-poly se sienta caro en todos los climas.

**Criterios:**
- Recorrido bioma × hora × clima (con el scrubbing ×10 que ya existe): **sin costuras, sin pop**, todo
  en gamut. **Solo se afina lo que Carlos marque** tras verlo; nada que ya guste se rediseña.
- Las rampas de intensidad de partículas/niebla son suaves (smoothstep), no lineales. Sin caída de fps
  (r3f-perf); linter de paleta en verde.

**Tareas:**
- [ ] Captura time-lapse de ciclos por bioma/clima; lista concreta de ajustes que apruebe Carlos.
- [ ] Aplicar solo lo aprobado (presets = datos). Documentar en `weatherConfig.ts` los parámetros sensibles.

---

## 5. Track B — Profundidad de atmósfera

### S2-B1 — Estaciones como datos · *(de S2.2-H2 — tu "mejorar el ciclo")*

**Como** Residente **quiero** que la atmósfera cambie lentamente por estación **para** que el mundo
tenga un ritmo más largo que el día/noche.

**Criterios:**
- `timeOfYear` (0..1) derivado del `epoch` de forma **determinista** (análogo a `timeOfDay`), idéntico
  en cliente y servidor (un "año" = N ciclos día/noche, configurable).
- Una `SeasonCycle` (datos, análoga a `biomes`) modula los presets por **lerp de color hacia un
  `colorMod`** — **sutil y siempre dentro del gamut** (lo valida el linter). **Sin geometría, sin tocar
  la transición** existente.
- Server-authoritative: el `season` activo se propaga en `ATMOSPHERE_UPDATE` (campo nuevo → coordina
  con S2-B3); el cliente lo resuelve igual que el servidor.

**Tareas:**
- [ ] `packages/atmosphere/src/seasons.ts` (`Season`, `SeasonCycle`); `timeOfYear` en `clock.ts`.
- [ ] `resolveAtmosphere(tod, biome, season)` aplica la modulación por lerp (sin cambiar la estructura).
- [ ] Extender el linter de paleta para validar que cada `colorMod` respeta house-celestial.
- [ ] Test de determinismo (mismo seed/tiempo → mismos params en ambos lados).

---

### S2-B2 — Ciclo de clima más rico · *("mejorar el ciclo de clima")*

**Como** Residente **quiero** que el clima tenga ritmo (rachas, pausas, rampas), no solo despejado/activo
binario **para** que el mundo se sienta vivo sin eventos especiales.

**Criterios:**
- El `WeatherDirector` pasa de constantes hardcoded (`CLEAR_MIN/MAX`, `ACTIVE_MIN/MAX`) a **perfiles
  data-driven** (`WeatherPhaseProfile`: duración min/max, intensidad base/pico, probabilidad de racha).
- La selección y duración siguen **sembradas** por `mulberry32` → **misma seed, misma secuencia**
  (determinismo intacto, sin `Math.random`). La intensidad puede **rampar** (0.7→1.0), no saltar.
- En 3-5 ciclos en vivo se ve variedad real (p. ej. dos rondas de lluvia, pausa, racha fuerte), sin
  cambiar el contrato `ATMOSPHERE_UPDATE` ni romper la transición cliente.

**Tareas:**
- [ ] `packages/atmosphere/src/weatherCycle.ts` con `WeatherPhaseProfile[]` (datos por bioma).
- [ ] Refactor de `WeatherDirector` para consumir perfiles (sembrado); rampa de intensidad.
- [ ] Tests: reproducibilidad por seed + variedad de fases.

---

### S2-B3 — Contrato de atmósfera versionado en `@osia/shared` · *(de S2.1-H3)*

**Como** Dev **quiero** que el contrato de atmósfera esté **versionado e independiente** de
`PROTOCOL_VERSION` **para** iterar el clima sin versionar todo el protocolo y validar payloads en bordes.

**Criterios:**
- `ATMOSPHERE_CONTRACT_VERSION` separado de `PROTOCOL_VERSION` (hoy todo cuelga de `constants.ts:6`).
- Esquema **Zod** que valida `{ kind: WeatherKind, intensity: number ∈ [0,1], season? }` al decodificar
  (rechazo seguro, no confianza ciega). El `season` nuevo de S2-B1 entra aquí.
- Round-trip tests para todos los `WEATHER_KINDS` × intensidades {0, 0.5, 1} y test de evolución
  (cliente viejo ↔ kind desconocido → fallback `despejado` graceful, que ya existe en `codec.ts:331`).

**Tareas:**
- [ ] `packages/shared/src/net/schemas/atmosphere.ts` (Zod + infer); exportar.
- [ ] `ATMOSPHERE_CONTRACT_VERSION` en `constants.ts` con changelog en comentario.
- [ ] Validar en `decode(ATMOSPHERE_UPDATE)`; extender `codec.test.ts`.

> Hacer **antes o junto con S2-B1** (las estaciones agregan el campo `season` al payload).

---

### S2-B4 — Persistencia/checkpoint del clima · *(de S2.1-H2 / S2.9-H3)*

**Como** Operador **quiero** que el clima se reanude tras un reinicio del world-server **para** que el
cielo no "salte".

**Criterios (honesto: valor modesto con un solo hub — implementación mínima):**
- El `WeatherDirector` expone `serialize()` → `{ seed, phaseUntil, active, weather }` y `restore(...)`.
- Al arrancar, `createWorld()` lee el último checkpoint (reusando el **pool pg que ya existe** en
  `presence.ts`) y restaura; si no hay, arranca normal. El día/noche **no** necesita persistencia (es
  determinista por tiempo).
- Checkpoint periódico `fire-and-forget` (cada N ticks, configurable), **sin bloquear el hot path**.

**Tareas:**
- [ ] **UN** checkpoint mínimo (una fila por instancia) — **NO** las 4 tablas del diseño IA
      (`atmosphere_presets/events/weather_cycles` son de la fase de eventos, fuera de alcance).
- [ ] `serialize()/restore()` en `WeatherDirector`; lectura en `createWorld()`; escritura en `loop.ts`.
- [ ] Test: dos arranques con mismo checkpoint → clima idéntico ±1 tick.

---

## 6. Track C — Cimientos transversales (sin IA)

### S2-C1 — Observabilidad: exponer `/metrics` (no-IA) · *(de S2.9-H2)*

**Como** Dev **quiero** un `/metrics` que muestre lo que ya se calcula **para** vigilar el presupuesto
de red y el tick sin adivinar.

**Criterios:**
- `GET /metrics` en el world-server devuelve `TickMetrics.snapshot()` (duración de tick EWMA, jugadores,
  bytes/jugador, conexiones WS) + un contador de difusiones de atmósfera; responde en <5 ms; sin Redis,
  sin IA.

**Tareas:**
- [ ] Endpoint `/metrics` en `http.ts` exponiendo `TickMetrics` (ya existe) + contador de broadcasts.
- [ ] Correlación por `tick`/timestamp con los logs Pino.

> **Diferido al track de ops (S1.9-externo), no a este sprint:** Sentry (web/api/world-client +
> source maps), webhooks a Discord, health-check keep-alive de Supabase. Es trabajo de DevOps, no de
> dominio; queda **trazado** aquí para no perderlo.

---

### S2-C2 — Borrado de cuenta en cascada + retención · *(de S2.9-H4 — privacidad, NO atmósfera)*

> **No es atmósfera**, es una **obligación de privacidad real** que se había diferido sin hogar. Se
> reincorpora aquí. El terreno ya está: soft-delete, cascadas FK y RLS existen en las migraciones; el
> trabajo es la orquestación, el endpoint y la retención.

#### S2-C2.1 — `DeleteAccountUseCase` + cascada transaccional + revocación de sesiones
**Como** Residente **quiero** borrar mi cuenta de verdad **para** confiar en el ecosistema.
**Criterios:**
- `DeleteAccountUseCase` (solo `apps/api`, no expuesto al cliente directo) borra **atómicamente**
  (BEGIN…COMMIT/ROLLBACK) en orden topológico: `profiles`, `avatars`, `email_verifications`,
  `presence_sessions`, e invitaciones del usuario; las FK con `ON DELETE CASCADE` ya resuelven el resto.
- Extiende `AuthSessionPort` con `revokeAllSessions(accountId)`; si Supabase falla, se loguea WARN pero
  el borrado local procede (el usuario pierde acceso igual). Emite evento de dominio `account.deleted`.
  Idempotente (re-ejecutar no rompe).
**Tareas:** puerto + adapter Supabase (revoke); use case inyectable; transacción ordenada; tests (atomicidad/rollback).

#### S2-C2.2 — Endpoint `DELETE /v1/accounts/me` con confirmación
**Como** Residente **quiero** una confirmación explícita **para** no borrar por accidente.
**Criterios:**
- `POST /v1/accounts/delete-request` (Bearer) → email con OTP/link único de 24 h, `202`. `POST
  /v1/accounts/delete-confirm?code` válido → ejecuta el use case, limpia la cookie de sesión, `204`.
  Link expirado/usado → `410`.
**Tareas:** tabla `account_delete_requests` (token hash, expira, usado); endpoints; envío de email; tests (expira/doble uso/limpieza de sesión).

#### S2-C2.3 — Retención (purga por antigüedad) + tests de integridad
**Como** Operador **quiero** podar datos viejos **para** controlar la DB y cumplir privacidad.
**Criterios (simplificado — sin tablas de auditoría de retención nuevas):**
- Purgador (cron `@nestjs/schedule`) configurable por env (`RETENTION_*_DAYS`): `audit_logs` y
  `presence_sessions` antiguos se podan **solo si no están ligados a cuenta viva**; cada corrida se
  loguea (Pino). Tests de integridad: cascada correcta, RLS post-borrado invisible, idempotencia.
**Tareas:** service purgador + cron + config; suite de integración (signup→datos→delete→verificar cascada/RLS).

---

## 7. Anti-alcance (qué queda fuera y por qué)

- ❌ **Toda la IA** (Habitantes, diálogo, voz, memoria, guardarrailes, `WorldSnapshot`-para-IA, schema
  `ai`, métricas de costo IA). **Diferida** → [fase-2-mundo-vivo.md](./fase-2-mundo-vivo.md) S2.4–S2.8.
- ❌ **Eventos efímeros / FOMO / aurora / meteoros** y sus tablas (`atmosphere_events/presets/weather_cycles`).
  Cortados; opcode `ATMOSPHERE_EVENT` queda desactivado pero listo.
- ❌ **Bloom.** Ya retirado (el halo de `SunMoon` lo reemplaza).
- ❌ **Sentry / Discord / keep-alive de Supabase.** Track de ops (S1.9-externo), no este sprint — trazado en S2-C1.
- ❌ **Persistencia "pesada"** (historial/auditoría de atmósfera). Solo el checkpoint mínimo de S2-B4.

---

## 8. Secuencia recomendada y tamaño honesto

**Total honesto: ~13-16 días efectivos (~3 semanas con foco fragmentado).** No es un mini-sprint.

Orden sugerido (por dependencias y por "valor visible primero"):
1. **A1 → A2 → A3** (atmósfera sensorial; A1 da una victoria visible rápida; A3 se solapa con B1).
2. **B3 → B1 → B2** (contrato primero porque B1 añade el campo `season`; B2 es independiente).
3. **B4** (opcional/bajo valor; cuando quieras continuidad tras reinicio).
4. **C1** (barato; en cualquier hueco).
5. **C2** (privacidad; es su propio mini-track de ~3-4 días, puede ir en paralelo a B por ser otra app).

Cada track es **entregable y commiteable por separado** (por hito, §0.1).

---

## 9. Notas transversales

- **Determinismo intacto:** `@osia/atmosphere` sigue puro y sembrado (sin `Math.random`; lint activo).
  Estaciones y ciclo enriquecido **deben** resolverse idénticos en cliente y servidor.
- **Rendimiento:** audio sin asignaciones por frame, dispose + cierre de `AudioContext`; checkpoint y
  métricas fuera del hot path (`fire-and-forget`); partículas siguen instanciadas.
- **Seguridad/privacidad:** sonido opt-in (silencio hasta el gesto); el borrado de cuenta revoca
  sesiones y purga en cascada; validación Zod del payload de atmósfera en bordes; secretos solo server-side.
- **Accesibilidad:** `prefers-reduced-motion` degrada el tinte del HUD; el sonido no es el único canal;
  contraste WCAG AA en todos los estados; toggles con foco visible y targets ≥44px.
- **Reuso:** toggle de sonido y motor de audio en `@osia/ui`; el contrato único en `@osia/shared`.
