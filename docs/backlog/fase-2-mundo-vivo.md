# Backlog de Sprints — Fase 2: Mundo Vivo

> ⚠️ **DIFERIDO (2026-06).** La IA (Habitantes, diálogo, voz, memoria, guardarrailes de costo) y los
> eventos efímeros (lluvia de meteoros, aurora, FOMO) de este backlog quedan **pospuestos, no
> cancelados**. El **Sprint 2 activo** es el rediseño centrado en cerrar la atmósfera que ya existe:
> ver [fase-2-atmosfera-viva.md](./fase-2-atmosfera-viva.md). Este documento se conserva íntegro como
> el diseño de la **fase de IA**, que se retomará cuando haya presupuesto de IA. No desarrollar desde
> aquí sin confirmar con Carlos.

> Propósito: Plan ejecutable, sprint a sprint, para que El Mundo de OSIA respire con 2 personas — Habitantes de IA con los que se habla (Whisper + Claude + TTS), motor de atmósfera completo (clima/estaciones/eventos efímeros autoritativos) y NPCs ambientales que reaccionan al clima. | Estado: Borrador v1 | Fecha: 2026-06-19 | Parte del paquete de diseño OSIA.

Documentos relacionados: ver [../00-vision-alcance.md](../00-vision-alcance.md), [../01-pilares-experiencia.md](../01-pilares-experiencia.md), [../03-arquitectura-sistema.md](../03-arquitectura-sistema.md), [../04-modelo-datos-er.md](../04-modelo-datos-er.md), [../05-realtime-mundo-networking.md](../05-realtime-mundo-networking.md), [../06-motor-atmosfera.md](../06-motor-atmosfera.md), [../07-habitantes-ia.md](../07-habitantes-ia.md), [../08-estrategia-rendimiento.md](../08-estrategia-rendimiento.md), [../09-seguridad-infra-costos.md](../09-seguridad-infra-costos.md), [../10-contratos-api-eventos.md](../10-contratos-api-eventos.md), [../11-glosario-dominio.md](../11-glosario-dominio.md).

---

## 1. Objetivo de la fase

Convertir El Mundo de "una escena bella donde caminamos con voz" (Fases 0-1) en un **mundo que respira**: el cielo cambia de forma combinatoria y autoritativa (hora × clima × estación × evento), aparecen **eventos efímeros raros** (lluvia de meteoros, aurora) que generan FOMO real, y lo habitan **3-4 Habitantes de IA brutalmente bien escritos** con los que se conversa por voz o texto, que recuerdan al usuario (memoria pgvector), conocen el estado del mundo (la misma verdad que ven los humanos) y reaccionan al clima. Todo esto con **guardarrailes de costo duros** para que el gasto de IA escale con el engagement y nunca con el reposo, dentro del runway de ~250 USD.

Esta fase materializa tres pilares de la constitución:

- **Habitantes IA** (Pilar #3): solución ESTRUCTURAL al "mundo vacío" — con 2-3 usuarios reales, los Habitantes son la única forma de que el mundo se sienta poblado.
- **Atmósfera Viva completa** (Pilar #1, extensión de Fase 0): clima/estaciones/scheduler de eventos efímeros server-authoritative y determinista.
- **Escasez** (Pilar transversal): los eventos efímeros raros solo se cazan estando dentro; registro de asistencia para un futuro rastro social (Fase 4/5).

> **Anti-alcance de Fase 2** (lo que NO se construye aquí): NO feed/seguidores/notificaciones (eso es Fase 3); NO minijuego/ranking/cosméticos (Fase 4); NO chisme social generado por IA en batch (se diseña el job, pero se activa en Fase 3); NO rival de juego (Fase 4); NO plots/economía (Fase 5). NO se reemplaza el world-server propio por nada; NO el cliente llama a Claude/Whisper directo (siempre vía apps/api).

---

## 2. Definition of Done de la FASE

La Fase 2 está **terminada y lanzable** cuando, en un entorno desplegado (Hetzner + Supabase + Vercel + Cloudflare R2), con dos amigos conectados a la vez:

1. **Atmósfera completa y autoritativa.** `packages/atmosphere` resuelve `AtmosphereParams` desde `seed + worldClock` de forma idéntica en cliente y servidor; el clima transiciona suavemente entre estados (soleado→lluvia→niebla), las estaciones avanzan, y el world-server difunde `ATMOSPHERE_UPDATE` solo en cambios. Dos amigos ven el mismo atardecer/tormenta al mismo tiempo.
2. **Eventos efímeros raros.** El scheduler determinista (`scheduleEvents(seed, policies, ...)`) programa al menos 2 tipos de evento (lluvia de meteoros, aurora) a horas aparentemente aleatorias pero reproducibles; cuando ocurre, el cliente lo renderiza, el world-server emite `ATMOSPHERE_EVENT`, y se registra quién estuvo presente.
3. **Pipeline de diálogo extremo a extremo.** Un usuario habla (push-to-talk) o escribe a un Habitante; el flujo Whisper STT → ensamblado de contexto (worldSnapshot + memorias kNN + historial corto) → Claude (streaming, tiering Haiku/Opus) → TTS → difusión por WS produce subtítulo + audio espacial en la sala, observable por todos los presentes. Primer token < ~1.5 s, primer audio < ~2 s en Haiku.
4. **3-4 Habitantes con persona y memoria.** Al menos 3 `InhabitantPersona` completas (guía, DJ/locutor de radio, narrador de eventos) con `voice_rules`, `boundaries`, `mood_modulation` y banco de líneas de fallback. La memoria por par (habitante, usuario) persiste hechos en pgvector y los recupera en conversaciones futuras (recall kNN top-K).
5. **Conciencia del mundo verdadera.** Los Habitantes siempre reciben el `worldSnapshot` autoritativo del world-server (hora/ciclo, clima, estación, evento activo, presencia) — nunca una hora local del servicio de IA. El guía menciona el atardecer real; el narrador anuncia la lluvia de meteoros cuando ocurre.
6. **Guardarrailes de costo activos y verificados.** Tiering Haiku (default) / Opus (momentos clave); prompt caching de Anthropic con `cache_read_input_tokens > 0` entre turnos; rate-limit por usuario + global (Redis token bucket); presupuesto diario de tokens con umbrales 80% (fuerza Haiku) / 100% (modo offline); kill-switch de presupuesto mensual (~15 USD) que degrada Habitantes a líneas pre-escritas y alerta a Discord. `max_tokens` bajo (220).
7. **NPCs ambientales que reaccionan al clima.** Locomoción por waypoints geométrica (costo IA $0); los Habitantes buscan refugio/cambian animación cuando empieza la lluvia, sin disparar IA.
8. **Seguridad y privacidad.** Input de usuario NUNCA entra al system prompt; `stop_reason == "refusal"` manejado con fallback en personaje; salida sanitizada antes de TTS; audio crudo de STT descartado tras transcribir (cero retención); cada turno auditado en `AuditLog` con `request_id` de Anthropic.
9. **Persistencia y reanudación.** Checkpoint periódico de `atmosphere_states` (epoch_tick) permite reanudar el cielo tras reinicio del world-server; el schema `ai` completo (con pgvector/HNSW) está migrado y con RLS donde aplique.
10. **Métricas instrumentadas.** Se miden por sesión: conversaciones IA/sesión, costo IA/sesión (microcents), latencia de primer token/primer audio, % de eventos efímeros con ≥1 testigo, cache hit ratio de Anthropic. Dashboards mínimos en /metrics + alertas a Discord.

**Criterio cualitativo (North Star de la fase):** dos amigos entran, les llueve encima, un Habitante comenta la tormenta con su voz, y uno de ellos dice *"esto está vivo"*. Si eso no pasa, la fase no está hecha.

### Entregable demostrable

Un **video/sesión en vivo de ~5 minutos** grabado en producción: dos amigos en el hub al atardecer; empieza a llover (transición suave de atmósfera, sincronizada en ambas pantallas); el guía (Habitante) saluda por nombre a un usuario que ya conoce y comenta la lluvia; el usuario le habla por voz y recibe respuesta con audio; un NPC ambiental corre a refugiarse; aparece (programada por seed para la demo) una lluvia de meteoros y el narrador la anuncia; al final, el HUD de costos internos muestra el gasto IA de la sesión por debajo del presupuesto y el cache hit ratio > 0.

---

## 3. Resumen de sprints

Dimensionado para **un dev solo (Carlos)**, foco fragmentado, sprints de ~1-2 semanas. Orden por dependencias: primero la base de datos y los contratos compartidos, luego el motor de atmósfera completo (terreno fuerte de Carlos, sin red), luego el pipeline de IA por capas (contexto → Claude → STT/TTS → memoria → guardarrailes), y por último la integración mundo-vivo y el endurecimiento.

| Sprint | Título | Duración | Depende de |
|---|---|---|---|
| **OSIA-S2.1** | Cimientos de datos y contratos (schema `ai` + atmósfera persistente + shared) | 1 sem | Fase 1 (identity/world migrados) |
| **OSIA-S2.2** | Motor de atmósfera completo (clima, estaciones, scheduler de eventos) | 2 sem | S2.1 |
| **OSIA-S2.3** | Difusión de atmósfera y eventos en el mundo (world-server + render R3F) | 1-2 sem | S2.2 |
| **OSIA-S2.4** | Habitantes server-authoritative + locomoción ambiental + reacción al clima | 1-2 sem | S2.1, S2.3 |
| **OSIA-S2.5** | Pipeline de diálogo de texto (contexto → Claude streaming → difusión WS) | 2 sem | S2.1, S2.4 |
| **OSIA-S2.6** | Voz: Whisper STT (push-to-talk) + TTS espacial + visemas | 1-2 sem | S2.5 |
| **OSIA-S2.7** | Memoria (pgvector): corto plazo, largo plazo, resumen y conciencia del mundo | 2 sem | S2.5 |
| **OSIA-S2.8** | Guardarrailes de costo, moderación, fallback offline y kill-switch | 1-2 sem | S2.5, S2.6, S2.7 |
| **OSIA-S2.9** | Integración Mundo Vivo, métricas, persistencia/reanudación y pulido de lanzamiento | 1-2 sem | todos |

Total estimado: ~13-17 semanas de trabajo efectivo (con foco fragmentado, planificar holgura).

---

## OSIA-S2.1 — Cimientos de datos y contratos

**Objetivo:** Tener en Postgres/Supabase el schema `ai` completo (con pgvector/HNSW), la persistencia de atmósfera lista para checkpoint/reanudar, y en `packages/shared` los tipos/enums/contratos de IA y atmósfera versionados, de modo que cliente, world-server y AI Service no diverjan. Sin esto, nada de la fase compila contra una verdad común.

**Duración estimada:** 1 semana.

**Dependencias:** Fase 1 completa (bootstrap de extensiones + `uuidv7`, schemas `identity`/`world` migrados, `set_updated_at`, RLS de `profiles`). `packages/atmosphere` ya existe con la lógica pura de Fase 0.

### Historias

---

#### OSIA-S2.1-H1 — Migración del schema `ai` con pgvector

**Como** Dev/Operador **quiero** crear el schema `ai` con todas sus tablas e índices vectoriales **para** persistir Habitantes, personas, memorias, conversaciones y turnos según el ER.

**Criterios de aceptación:**
- Dado que aplico la migración, Cuando reviso la DB, Entonces existen las tablas `ai.inhabitants`, `ai.inhabitant_personas`, `ai.inhabitant_memories`, `ai.conversations`, `ai.conversation_turns` con PK `uuidv7()`, `timestamptz` UTC y `deleted_at` donde aplique.
- Dado `ai.inhabitant_memories`, Entonces tiene columna `embedding vector(1536)` y un índice HNSW con `vector_cosine_ops`.
- Dado `ai.inhabitant_personas`, Entonces es versionada (`persona_id`, `version`, inmutable) y contiene `display_name`, `role`, `biography`, `voice_rules[]`, `boundaries[]`, `tts_voice_id`, `tts_style`, `mood_modulation`, y líneas de fallback tagueadas por mood.
- Dado `ai.conversation_turns`, Entonces incluye campos de auditoría de costo: `model`, `input_tokens`, `output_tokens`, `cache_read_input_tokens`, `cost_microcents`, `anthropic_request_id`.
- Dado el trigger reutilizable, Entonces `set_updated_at` está aplicado en cada tabla nueva.
- La migración es forward-only, versionada en git con la convención `<YYYYMMDD>__<NNNN>_ai_<desc>.sql`.

**Tareas técnicas:**
- [ ] Crear migración `ai_core.sql` (Supabase CLI) habilitando `vector` si falta; `CREATE SCHEMA ai`.
- [ ] Tablas: `inhabitants`, `inhabitant_personas` (versionada), `inhabitant_memories` (embedding `vector(1536)`), `conversations`, `conversation_turns`.
- [ ] Índice HNSW: `CREATE INDEX ON ai.inhabitant_memories USING hnsw (embedding vector_cosine_ops)`; índice compuesto `(inhabitant_id, user_id)` para filtrar recall.
- [ ] Particionar `ai.conversation_turns` por RANGE mensual (alineado con doc 04) + política de retención.
- [ ] Aplicar `set_updated_at` y soft-delete; `service`-only (no expuesto por PostREST salvo lectura controlada).
- [ ] Seeds idempotentes de 0 (las personas reales llegan en S2.4/S2.5).
- [ ] Documentar el cambio de default `uuidv7()`→nativa cuando Supabase suba a PG18 (nota, no acción).

**DoD:** Migración aplica limpio en local y staging; `supabase db diff` no marca drift; un `INSERT`/recall kNN de prueba sobre `inhabitant_memories` con un vector dummy funciona y usa el índice (verificado con `EXPLAIN`).

---

#### OSIA-S2.1-H2 — Persistencia y checkpoint de atmósfera

**Como** Dev/Operador **quiero** tablas de atmósfera con capacidad de checkpoint del `epoch_tick` **para** que el cielo se reanude tras un reinicio del world-server sin "saltar".

**Criterios de aceptación:**
- Dado el schema `atmosphere`, Entonces existen `atmosphere_states` (autoritativo, con `worldClock{epoch,scale}`, `seed`, `season`, `weather`, `biome`, `active_preset`, `axis_targets`, `transition`, `active_event`, `epoch_tick`), `atmosphere_presets` (con `slug`/`code` natural), `atmosphere_events` (efímero, con índice parcial `scheduled`) y `weather_cycles`.
- Dado un reinicio simulado del world-server, Cuando arranca, Entonces lee el último `atmosphere_states.epoch_tick` y reconstruye el mismo punto del ciclo día/noche (verificable: el color del cielo coincide ±1 tick).
- Dado `atmosphere_presets`/`atmosphere_events`, Entonces sus `slug`/`code` se referencian desde `packages/shared` (no IDs expuestos).

**Tareas técnicas:**
- [ ] Migración `atmosphere_core.sql`: tablas según ER, índice parcial `WHERE state = 'scheduled'` en `atmosphere_events`.
- [ ] Definir el contrato de checkpoint: cuándo persiste el world-server (cada N ticks, configurable) — implementación del job va en S2.9, aquí solo schema + función SQL de upsert.
- [ ] Función SQL/`upsert` de checkpoint y de lectura del último estado por `world_instance`.
- [ ] Verificar frontera Postgres vs Redis (doc 04): Postgres = durable, Redis = atmósfera vigente en caliente; el world-server persiste agregados, no cada frame.

**DoD:** Tablas migradas; prueba unitaria de upsert+lectura de checkpoint pasa; documentado el cadence de checkpoint a implementar en S2.9.

---

#### OSIA-S2.1-H3 — Contratos compartidos de IA y atmósfera en `packages/shared`

**Como** Dev **quiero** los tipos, enums y contratos de IA y atmósfera versionados en `@osia/shared` **para** que cliente, world-server y AI Service usen exactamente la misma verdad y se invaliden atómicamente al cambiar.

**Criterios de aceptación:**
- Dado `packages/shared`, Entonces re-exporta los tipos de `packages/atmosphere` (`AtmosphereState`, `AtmospherePreset`, `AtmosphereEvent`, `AtmosphereParams`) con un número de versión de contrato (bump atómico cliente↔servidor).
- Dado el contrato de trigger de diálogo, Entonces existe `triggerDialogue(inhabitantId, userId, payload, worldSnapshot)` y el tipo `WorldSnapshot` (hora/ciclo, clima, estación, evento efímero activo, presencia) definidos en `shared` y consumidos por world-server y AI Service.
- Dado el catálogo de enums, Entonces `InstanceKind` (HUB/ZONE/PLOT), `AtmosphereEvent.type` ('meteor-shower'|'aurora'|...), `InhabitantRole` ('guide'|'dj'|'event-narrator'|...) y los `dominio.acción` (`ai.turn.appended`, `atmosphere.event.started`) están como constantes en `shared`, espejo de los CHECK de la DB.
- Schemas Zod de los DTOs de IA (entrada/salida del turno) en `shared/schemas`, usables en cliente y servidor.

**Tareas técnicas:**
- [ ] Crear `shared/domain/enums.ts` con `InstanceKind`, `AtmosphereEvent.type`, `InhabitantRole`, `Mood`, etc.; alinear 1:1 con CHECK del ER (S2.1-H1/H2).
- [ ] Crear `shared/contracts/ai.ts`: `WorldSnapshot`, `TriggerDialogue`, `DialogueResponse` ({texto, audioUrl/stream, visemas}), `PersonaBrief`.
- [ ] Re-exportar tipos de atmósfera desde `shared/contracts/atmosphere.ts` con `ATMOSPHERE_CONTRACT_VERSION` y `AI_CONTRACT_VERSION`.
- [ ] Schemas Zod en `shared/schemas/ai.ts` (cuerpo del mensaje `POST /v1/inhabitants/{id}/messages`, límites de longitud).
- [ ] Catálogo de eventos `dominio.acción` en `shared/catalog/events.ts`.

**DoD:** `@osia/shared` compila y exporta los tipos; un test de contrato verifica que cada `code`/enum existe tanto en `shared` como en los CHECK de la DB; documentado el procedimiento de bump de versión.

**Notas de seguridad/rendimiento:** El `WorldSnapshot` debe ser compacto (se inyecta en cada prompt); definir su forma con campos mínimos. Esta historia es la fuente única de verdad del lenguaje (alineado con doc 11) — cualquier divergencia se corrige aquí.

---

## OSIA-S2.2 — Motor de atmósfera completo

**Objetivo:** Extender `packages/atmosphere` (Fase 0 ya trae `resolveAtmosphere`/`interpolate`/`scheduleEvents` básicos y 4 presets) a clima dinámico con transiciones suaves, avance de estaciones, y un scheduler de eventos efímeros **determinista** que produce aleatoriedad percibida pero reproducible y server-authoritative. Todo lógica pura, sin I/O — el terreno fuerte de Carlos.

**Duración estimada:** 2 semanas.

**Dependencias:** OSIA-S2.1 (tipos/enums en shared).

### Historias

---

#### OSIA-S2.2-H1 — Ciclo de clima con transiciones suaves

**Como** Residente **quiero** que el clima cambie gradualmente (soleado→nublado→lluvia→niebla) **para** que el mundo se sienta vivo y nunca "cambie de golpe".

**Criterios de aceptación:**
- Dado `AtmosphereState.weather{current, next, changeAtWorldTime}`, Cuando el `worldClock` cruza `changeAt`, Entonces el estado transiciona con `transition{from, to, startedAt, durationMs}` y `resolveAtmosphere` interpola continuamente (nunca un interruptor).
- Dado que interpolo colores, Entonces se hace en OKLab/OKLCH (no sRGB) para evitar grises muertos; direcciones de sol/luna con slerp; floats con smoothstep; partículas/audio con histéresis para no parpadear.
- Dado el mismo `seed + worldClock`, Cuando ejecuto `resolveAtmosphere` en dos procesos, Entonces devuelve `AtmosphereParams` idénticos (determinismo — PRNG sembrado, nunca `Math.random`).

**Tareas técnicas:**
- [ ] Modelar `WeatherCycle` dentro de `AtmosphereState.weather` con `current/next/changeAtWorldTime`.
- [ ] Implementar transición de clima en `resolveAtmosphere`: mezcla por capas con prioridad (hora × clima × estación × bioma × evento), ningún eje añade geometría.
- [ ] Implementar/usar `lerpParams(from, to, k)` con OKLab para color, slerp para direcciones, smoothstep para floats; histéresis para fx/audio.
- [ ] Elegir e implementar PRNG determinista (mulberry32/xoshiro); prohibir `Math.random` por lint.
- [ ] Definir `worldClock.scale` (ciclo día/noche ~60-90 min en Fase 0/2) y un generador de secuencia de clima sembrada por `seed`.

**DoD:** Tests unitarios de `resolveAtmosphere` (determinismo, continuidad, sin snaps) pasan; dos ejecuciones con mismo seed coinciden bit a bit en los floats relevantes.

---

#### OSIA-S2.2-H2 — Estaciones que avanzan

**Como** Residente **quiero** que las estaciones cambien con el tiempo **para** que el mundo tenga un ritmo más largo que el día/noche.

**Criterios de aceptación:**
- Dado `AtmosphereState.season`, Cuando avanza el `worldClock`, Entonces la estación progresa según un calendario configurable y modula los presets/paleta (sin añadir geometría).
- Dado el eje estación, Entonces se resuelve en capas con prioridad junto a hora/clima (no por concatenación).

**Tareas técnicas:**
- [ ] Añadir el eje `season` al producto cartesiano de moods; mapear estación→sesgo de paleta/preset.
- [ ] Validar con el linter de presets que cada combinación respeta la house-palette (S2.2-H4).
- [ ] Documentar el calendario de estaciones y su `scale` relativo al día/noche.

**DoD:** Test que avanza el reloj un "año" de mundo y verifica el ciclo completo de estaciones; sin snaps en los límites de estación.

---

#### OSIA-S2.2-H3 — Scheduler determinista de eventos efímeros

**Como** Residente **quiero** que ocurran eventos raros (lluvia de meteoros, aurora) a horas aparentemente aleatorias **para** sentir FOMO y exclusividad ("solo se cazan estando dentro").

**Criterios de aceptación:**
- Dado `scheduleEvents(seed, policies, windowStart, windowEnd)`, Entonces devuelve `AtmosphereEvent[]` de forma determinista (PRNG sembrado), reproducible y server-authoritative — random percibido, no moneda por tick.
- Dadas las `AtmosphereEventPolicy` (type, rarity, window, hourBias, announce, layer, cooldownMin, weight), Entonces meteor-shower y aurora se programan con rareza ~1×/semana a hora con `hourBias` (p.ej. nocturna) y respetan `cooldownMin`.
- Dado un evento, Entonces tiene `layer` parcial (no reemplaza toda la atmósfera), `startWorldTime`/`endWorldTime` y `announce` (raro/no anunciado).
- Dado el mismo seed y ventana, Cuando dos procesos llaman `scheduleEvents`, Entonces obtienen exactamente los mismos eventos en los mismos tiempos.

**Tareas técnicas:**
- [ ] Implementar `scheduleEvents` con PRNG sembrado por `(seed, type, windowIndex)`; nada de estado global.
- [ ] Autorar 2 `AtmosphereEventPolicy`: `meteor-shower` y `aurora` (rarity, window, hourBias, cooldownMin, layer).
- [ ] Aplicar el evento como capa parcial en `resolveAtmosphere` (modula `axes`/`fx`, no geometría).
- [ ] Helper "forzar evento para demo" (seed/override controlado) — necesario para el entregable demostrable, sin romper la efimeridad real.

**DoD:** Tests de determinismo y de rareza (frecuencia esperada en una ventana larga) pasan; un evento programado modula correctamente los params en el instante correcto.

---

#### OSIA-S2.2-H4 — House-palette + linter de presets en CI

**Como** Dev **quiero** un linter que valide que todo preset/mood respeta la paleta celestial de OSIA **para** variar sin perder el alma de marca.

**Criterios de aceptación:**
- Dada `HousePalette` ('house-celestial' con gamuts permitidos + colores prohibidos + reglas de post-fx), Cuando un preset usa un color fuera de gamut, Entonces el linter falla en CI.
- Dado ADR-000, Entonces house-celestial es el default y los moods A/B/C quedan como paletas alternativas seleccionables sin tocar el motor.

**Tareas técnicas:**
- [ ] Definir `HousePalette` con gamuts (champán/ónix/marfil/taupe + derivados) y `forbidden`.
- [ ] Escribir linter como test (recorre todos los presets, valida cada color en OKLCH contra el gamut).
- [ ] Integrar en GitHub Actions con cache de Turbo.
- [ ] Registrar en ADR-000 la decisión creativa (house-celestial por defecto).

**DoD:** El linter corre en CI y falla ante un color prohibido (probado con un preset intencionalmente malo); los 4 presets de Fase 0 + cualquiera nuevo pasan.

**Notas:** Esto protege la identidad de marca (lujo = consistencia) y permite la disciplina anti-pozo: expandir luego es solo datos (preset/evento/bioma = cero código).

---

## OSIA-S2.3 — Difusión de atmósfera y eventos en el mundo

**Objetivo:** Conectar el motor puro al mundo real: el world-server avanza `AtmosphereState` en su tick y difunde `ATMOSPHERE_UPDATE`/`ATMOSPHERE_EVENT` solo en cambios; el world-client R3F traduce `AtmosphereParams` a luces/niebla/postFX/partículas/audio con crossfade. Sincronización del `worldClock` para que quien entra a mitad vea el mismo punto.

**Duración estimada:** 1-2 semanas.

**Dependencias:** OSIA-S2.2 (motor completo), OSIA-S2.1-H2 (persistencia atmósfera).

### Historias

---

#### OSIA-S2.3-H1 — Avance y difusión de atmósfera en el world-server

**Como** Dev **quiero** que el world-server avance la atmósfera en su tick y la difunda compacta **para** que el cielo sea el mismo para todos sin saturar la red.

**Criterios de aceptación:**
- Dado el bucle de tick (20 Hz, paso 6 del tick por doc 05), Cuando los `axisTargets`/preset/clima cambian, Entonces emite `ATMOSPHERE_UPDATE (0x88)` con el estado compacto (`baseTime`, `axes`, `transitionMs`, `presetId?`, `seed`); en reposo no emite nada (solo en cambios).
- Dado un evento programado por `scheduleEvents`, Cuando llega su `startWorldTime`, Entonces emite `ATMOSPHERE_EVENT (0x89)`.
- Dado que un cliente entra a mitad, Entonces recibe el `AtmosphereState` vigente en el SNAPSHOT de join y, vía sincronización de reloj (PING/PONG), resuelve el mismo punto.
- La difusión entre procesos usa Redis Pub/Sub (atmósfera global por defecto).

**Tareas técnicas:**
- [ ] Integrar `packages/atmosphere` en el world-server; avanzar `AtmosphereState` en el paso 6 del tick.
- [ ] Implementar emisión de `ATMOSPHERE_UPDATE`/`ATMOSPHERE_EVENT` solo en deltas (comparar contra último difundido).
- [ ] Incluir `AtmosphereState` compacto en el SNAPSHOT al join/reaparición.
- [ ] Sincronización de `worldClock` con `serverTime` vía PING/PONG (coordinar con doc 05 §9.2).
- [ ] Difusión por Redis Pub/Sub entre procesos del world-server.
- [ ] Métricas por tick (Pino) del costo de avanzar atmósfera.

**DoD:** Dos clientes ven la misma transición de atardecer/tormenta simultáneamente; un cliente que entra a mitad ve el punto correcto; el ancho de banda de atmósfera es despreciable en reposo (medido).

---

#### OSIA-S2.3-H2 — Traductor de AtmosphereParams a render R3F

**Como** Residente **quiero** ver el cielo, la niebla, el bloom y las partículas reaccionar al estado de atmósfera **para** que el low-poly se sienta caro.

**Criterios de aceptación:**
- Dado un `AtmosphereParams`, Entonces el world-client mapea a: color/intensidad de luces (sol/luna), `FogExp2` con color dictado por la atmósfera, postFX (bloom, tone mapping ACES, vignette, color grading), partículas instanciadas (lluvia/meteoros) y mezclador de audio ambiente con crossfade.
- Dado un cambio de atmósfera, Entonces el render transiciona suavemente (sin pop) usando interpolación del lado cliente con el mismo `resolveAtmosphere`.
- Dado el contrato del HUD (`--atmo-tint`/`--atmo-glow`/`--atmo-contrast` de doc 02), Entonces el world-client lo actualiza en runtime para que el HUD "respire el cielo".

**Tareas técnicas:**
- [ ] Implementar el traductor `AtmosphereParams → escena` (luces, `FogExp2`, postprocessing).
- [ ] Partículas instanciadas para lluvia y meteoros (InstancedMesh, object pooling).
- [ ] Mezclador de audio ambiente (Howler/WebAudio) con crossfade ligado a la atmósfera (`--amb-dusk/-night/-event-meteor` de doc 02).
- [ ] Actualizar el contrato `--atmo-*` en runtime para el HUD.
- [ ] Acoplar fade-in de chunks con la niebla (coordinar con doc 08), aunque el terreno siga siendo una malla única en esta fase.

**DoD:** En una escena de prueba, cambiar el clima/hora produce una transición visual y de audio suave; el HUD cambia de tinte con el cielo; sin caída perceptible de fps (medido con r3f-perf).

---

#### OSIA-S2.3-H3 — Render de eventos efímeros y registro de asistencia

**Como** Residente **quiero** ver la lluvia de meteoros/aurora cuando ocurre **para** vivir un momento raro y exclusivo; **como** Sistema **quiero** registrar quién estuvo presente **para** un futuro rastro social.

**Criterios de aceptación:**
- Dado `ATMOSPHERE_EVENT`, Cuando el cliente lo recibe, Entonces renderiza el efecto (meteoros instanciados / banda de aurora) como capa sobre la atmósfera base.
- Dado un evento activo, Cuando un usuario está presente en la sala, Entonces el world-server registra su asistencia (persistida, vinculada al `atmosphere_events.id`).
- El registro NO rompe la efimeridad: el cosmético/achievement de testigo se diseña pero se entrega en Fase 4/5.

**Tareas técnicas:**
- [ ] Render de meteoros (trails instanciados) y aurora (shader/banda) disparado por el evento.
- [ ] Registro de asistencia: al iniciar/durante el evento, persistir `(event_id, account_id)` (tabla puente o campo de presencia).
- [ ] Emitir `atmosphere.event.started`/`...ended` al bus de dominio (para Fase 3+).
- [ ] Documentar el contrato del futuro Achievement "Testigo de la lluvia de meteoros" (no implementar aún).

**DoD:** Forzando un evento (helper de demo), ambos clientes lo ven y queda registrada la asistencia de los presentes; verificado en DB.

**Notas:** Este es el mecanismo de escasez por diseño. La asistencia es el dato que paga FOMO; mantenerlo barato y correcto.

---

## OSIA-S2.4 — Habitantes server-authoritative + locomoción ambiental

**Objetivo:** Dar presencia física a los Habitantes en el mundo (instancia viva, ubicación, mood, estado de actividad), con locomoción por waypoints **geométrica** (costo IA $0) y **reacción al clima** sin disparar IA (buscar refugio, cambiar animación). Esto resuelve el "mundo vacío" antes incluso de que hablen.

**Duración estimada:** 1-2 semanas.

**Dependencias:** OSIA-S2.1 (schema `ai`), OSIA-S2.3 (atmósfera en el mundo).

### Historias

---

#### OSIA-S2.4-H1 — Instancia viva del Habitante en el world-server

**Como** Residente **quiero** ver Habitantes presentes en el hub/zonas **para** que el mundo nunca se sienta vacío con 2 personas.

**Criterios de aceptación:**
- Dado un `Inhabitant` (instancia viva: `inhabitantId`, ubicación/instancia, `mood`, estado de actividad), Entonces el world-server lo mantiene server-authoritative y lo difunde como una entidad más (ENTITY_JOIN/DELTA) sujeta a AOI.
- Dado un Habitante, Entonces referencia una `InhabitantPersona` (plantilla inmutable) por `persona_id` + `version`.
- Dado el cliente, Entonces renderiza el avatar low-poly del Habitante con su nameplate (HUD diegético, doc 02).

**Tareas técnicas:**
- [ ] Modelo del `Inhabitant` en el world-server (estado en memoria + checkpoint a `ai.inhabitants`).
- [ ] Difundir Habitantes como entidades (reusar el pipeline de entidades/AOI de doc 05).
- [ ] Render del avatar del Habitante + Nameplate en world-client.
- [ ] Sembrar 3-4 instancias en el hub (las personas reales se escriben en S2.5).

**DoD:** Dos usuarios ven 3-4 Habitantes quietos en el hub con sus nombres; los Habitantes aparecen/desaparecen por AOI correctamente.

---

#### OSIA-S2.4-H2 — Locomoción por waypoints (geométrica, $0 IA)

**Como** Residente **quiero** que los Habitantes caminen por el mundo **para** que parezcan vivos sin que cueste un centavo de IA.

**Criterios de aceptación:**
- Dado un grafo de waypoints por instancia, Cuando el tick avanza, Entonces los Habitantes se mueven entre waypoints con comportamiento ambiental (deambular, pausas) calculado geométricamente, sin ninguna llamada a IA.
- Dado el movimiento, Entonces es server-authoritative y se difunde por DELTA como cualquier entidad (clamp de velocidad, sin teleport).

**Tareas técnicas:**
- [ ] Definir grafos de waypoints por instancia (datos).
- [ ] Implementar la máquina de estados de deambular (idle/walk/pause) en el world-server.
- [ ] Integrar con la difusión de entidades (DELTA) y la física kinematic (Rapier WASM compartido, doc 05).

**DoD:** Los Habitantes deambulan de forma creíble en ambos clientes; cero llamadas a la API de IA durante el deambular (verificado en logs).

---

#### OSIA-S2.4-H3 — Reacción al clima (refugio/animación), sin IA

**Como** Residente **quiero** ver a los Habitantes reaccionar a la lluvia (refugiarse, cambiar de pose) **para** que el clima se sienta consecuente.

**Criterios de aceptación:**
- Dado que la atmósfera entra en estado de lluvia/tormenta, Cuando el world-server lo detecta, Entonces los Habitantes cambian su comportamiento ambiental (ir a un waypoint de refugio, animación de cubrirse) sin disparar IA.
- Dado que el clima vuelve a despejar, Entonces retoman el deambular normal.
- La reacción usa el mismo `AtmosphereState` autoritativo (no una verdad paralela).

**Tareas técnicas:**
- [ ] Marcar waypoints de "refugio" en los grafos.
- [ ] Regla geométrica: si `weather.current ∈ {rain, storm}` → enrutar a refugio + animación.
- [ ] Coordinar animaciones (Meshopt para avatares animados, doc 08).

**DoD:** Al forzar lluvia, los Habitantes se refugian en ambos clientes; al despejar, vuelven a deambular; sin llamadas a IA.

**Notas:** Junto con S2.4-H1/H2, esto cumple parte del DoD "el mundo respira" incluso antes del diálogo. La locomoción y reacción son el contrapeso barato a la escasez de usuarios.

---

## OSIA-S2.5 — Pipeline de diálogo de texto

**Objetivo:** El corazón de la fase. Implementar el AI Service en `apps/api` (NestJS hexagonal, bounded context `inhabitants`) que, ante un trigger del world-server, ensambla el contexto, llama a Claude en **streaming** con **tiering Haiku/Opus** y **prompt caching**, y difunde el resultado (texto en streaming) a todos los clientes de la sala vía el world-server (conversación observable). Voz y memoria llegan en S2.6/S2.7; aquí se monta el esqueleto extremo a extremo en texto.

**Duración estimada:** 2 semanas.

**Dependencias:** OSIA-S2.1 (schema + contratos), OSIA-S2.4 (Habitantes vivos).

### Historias

---

#### OSIA-S2.5-H1 — Bounded context `inhabitants` y contrato de trigger

**Como** Dev **quiero** el contexto `inhabitants` hexagonal en `apps/api` y el contrato de trigger world-server↔AI Service **para** orquestar el diálogo sin acoplar capas.

**Criterios de aceptación:**
- Dado `apps/api`, Entonces existe un módulo Nest `inhabitants` con `domain/application/infrastructure` y ports `in/out`; los adapters (Claude, Redis, Supabase) viven solo en `infrastructure`.
- Dado el world-server, Cuando un usuario interactúa con un Habitante, Entonces dispara `triggerDialogue(inhabitantId, userId, payload, worldSnapshot)` (3 tipos: dirigido, ambiental, de evento); el world-server NO llama a Claude — solo dispara y difunde.
- Dado el AI Service, Entonces responde `{ texto, audioUrl/stream, visemas }` (audio/visemas vacíos en esta historia) para que el world-server difunda.
- Endpoint de soporte REST `POST /v1/inhabitants/{id}/messages` (Bearer JWT) para historial/diálogo de texto directo.

**Tareas técnicas:**
- [ ] Scaffold del módulo `inhabitants` hexagonal (espejo de `umas-*-service`).
- [ ] Definir ports: `DialogueOrchestratorPort` (in), `ClaudePort`/`MemoryPort`/`AuditPort` (out).
- [ ] Implementar el canal world-server→AI Service (HTTP interno o cola) con el contrato `triggerDialogue` de `shared`.
- [ ] Implementar la difusión de la respuesta del AI Service de vuelta al world-server → `NPC_DIALOG_MSG (0x8D)` por WS (streaming).
- [ ] Endpoint REST `POST /v1/inhabitants/{id}/messages` + `GET /v1/conversations/me`.

**DoD:** Un trigger de texto produce una respuesta difundida a la sala; arquitectura hexagonal verificada (sin SDK de Claude fuera de `infrastructure`).

---

#### OSIA-S2.5-H2 — Ensamblado de prompt con orden estable para caching

**Como** Dev **quiero** ensamblar el prompt en un orden estable (system cacheable + messages volátiles) **para** maximizar el prompt caching de Anthropic y bajar costo/latencia.

**Criterios de aceptación:**
- Dado el ensamblado, Entonces el `system` contiene [reglas globales OSIA + persona compilada + formato de salida] con `cache_control: {type: "ephemeral"}` en el prefijo estable; los `messages` contienen [conciencia del mundo, memorias kNN (S2.7), historial corto, turno del usuario].
- Dado el input del usuario, Entonces va SIEMPRE en `messages`, NUNCA en `system` (defensa anti prompt-injection).
- Dado el modelo (Opus 4.8), Entonces se usa `thinking: {type: "adaptive"}` solo si aplica al momento; respuestas cortas con `max_tokens: 220`.
- Dado dos turnos consecutivos del mismo Habitante, Entonces `usage.cache_read_input_tokens > 0` (verificado).

**Tareas técnicas:**
- [ ] Compilar la persona en un bloque de system estable (rol/biografía/voice_rules/boundaries/formato).
- [ ] Marcar el prefijo estable con `cache_control: {type: "ephemeral"}` (system text block) usando `@anthropic-ai/sdk`.
- [ ] Construir `messages` con conciencia del mundo (placeholder de worldSnapshot, completo en S2.7), historial corto y turno del usuario al final.
- [ ] Auditar invalidadores silenciosos del cache (sin timestamps/UUIDs en el prefijo, JSON ordenado, set de personas estable).
- [ ] Verificar `cache_read_input_tokens` en logs entre turnos.

**DoD:** Dos turnos seguidos muestran `cache_read_input_tokens > 0`; el input del usuario nunca aparece en `system` (test); `max_tokens=220`.

**Notas de seguridad:** El input en `messages` (no `system`) y los `boundaries` explícitos por persona son la primera línea anti prompt-injection. Las instrucciones a mitad de sesión van como mensajes `role:system` en `messages`, no editando el system prompt (preserva cache).

---

#### OSIA-S2.5-H3 — Llamada a Claude en streaming con tiering Haiku/Opus

**Como** Residente **quiero** que el Habitante responda rápido y barato **para** que la conversación se sienta natural y el costo escale correctamente.

**Criterios de aceptación:**
- Dado `pickModel(ctx)`, Entonces selecciona `claude-haiku-4-5` por defecto (charla/relleno) y `claude-opus-4-8` solo en momentos clave (primer encuentro del invitado, narración de evento raro, conversación profunda).
- Dado el streaming (`messages.stream`), Entonces el subtítulo empieza a difundirse con los primeros tokens; objetivo primer token < ~1 s en Haiku.
- Dado `max_tokens: 220`, Entonces las respuestas son cortas (1-3 frases) — palanca única de costo y estética de lujo (contención).
- Dado cada respuesta, Entonces se contabiliza `usage` (input/output/cache_read tokens, model, `request_id`) en `ai.conversation_turns`.

**Tareas técnicas:**
- [ ] Adapter `ClaudeAdapter` con `@anthropic-ai/sdk` usando `client.messages.stream(...)` y `.get_final_message()`/`finalMessage()`.
- [ ] Implementar `pickModel(ctx)` con la lógica de momento clave; ids exactos `claude-haiku-4-5` (default) y `claude-opus-4-8` (clave).
- [ ] Streaming de tokens → world-server → `NPC_DIALOG_MSG` (subtítulo incremental).
- [ ] Persistir el turno con costos en `ai.conversation_turns` (`model`, tokens, `cost_microcents`, `anthropic_request_id`).
- [ ] Manejar `stop_reason` (incl. `refusal` → fallback en S2.8); `pause_turn` no aplica (sin server-tools).

**DoD:** Un usuario escribe a un Habitante y ve la respuesta aparecer en streaming en < ~1-1.5 s; el turno queda persistido con su costo y modelo; Haiku por defecto, Opus solo en primer encuentro (verificado).

**Notas de costo:** Esta historia es donde nace el costo variable. Tiering + `max_tokens` bajo + caching son las tres palancas; los guardarrailes duros (presupuesto, rate-limit, kill-switch) llegan en S2.8 pero el contabilizado de `usage` empieza aquí.

---

## OSIA-S2.6 — Voz: STT (push-to-talk) + TTS espacial + visemas

**Objetivo:** Cerrar el loop de voz: el usuario habla con push-to-talk → Whisper transcribe (audio crudo descartado tras transcribir) → el pipeline de S2.5 produce texto → TTS genera la voz del Habitante (streaming si el proveedor lo permite) → audio espacial + visemas para sincronía de labios. La voz humana entre usuarios sigue siendo P2P (Fase 0) y nunca toca el servidor.

**Duración estimada:** 1-2 semanas.

**Dependencias:** OSIA-S2.5 (pipeline de texto funcionando).

### Historias

---

#### OSIA-S2.6-H1 — STT con Whisper y push-to-talk

**Como** Residente **quiero** hablarle a un Habitante manteniendo una tecla **para** conversar por voz sin escribir.

**Criterios de aceptación:**
- Dado push-to-talk (opt-in), Cuando el usuario suelta la tecla, Entonces el audio se envía al AI Service, Whisper lo transcribe a texto y el audio crudo se descarta tras transcribir (cero retención).
- Dado un timeout corto de STT, Cuando Whisper tarda/falla, Entonces se cae a entrada de texto con un mensaje claro (no se cuelga).
- Dado el rate-limit, Entonces `rl:ai:stt:{account}` limita las transcripciones por usuario.

**Tareas técnicas:**
- [ ] Captura de audio push-to-talk en world-client (mic = self por Permissions-Policy).
- [ ] Adapter de STT (Whisper) en `apps/api/infrastructure`; timeout corto; descarte de audio crudo post-transcripción.
- [ ] El texto transcrito entra como `payload` del `triggerDialogue` (dirigido).
- [ ] Rate-limit `rl:ai:stt:{account}` (Redis) — cableado completo en S2.8, clave reservada aquí.

**DoD:** El usuario habla, ve su transcripción y el Habitante responde; el audio crudo no se persiste (verificado); fallo de STT cae a texto.

**Notas de privacidad:** Push-to-talk opt-in + descarte de audio crudo es requisito de la sección de privacidad (doc 09). La voz humana↔humano sigue siendo P2P/mesh sin grabación.

---

#### OSIA-S2.6-H2 — TTS de la voz del Habitante (streaming + audio espacial)

**Como** Residente **quiero** oír al Habitante con su propia voz **para** que la conversación se sienta encarnada.

**Criterios de aceptación:**
- Dado un texto de respuesta, Entonces el AI Service genera audio TTS con la `tts_voice_id`/`tts_style` de la persona; en streaming si el proveedor lo soporta (objetivo primer audio < ~1.5 s en Haiku).
- Dado el audio, Entonces se difunde y el world-client lo reproduce como audio espacial posicionado en el Habitante (con ducking del ambiente, doc 02).
- Dado el rate-limit, Entonces `rl:ai:tts:{account}` limita la síntesis por usuario.

**Tareas técnicas:**
- [ ] Adapter de TTS en `apps/api/infrastructure`; soporte de streaming si existe.
- [ ] Difundir el audio (URL/stream) en `DialogueResponse`; el world-server lo incluye en `NPC_DIALOG_MSG`.
- [ ] Reproducción espacial en world-client (WebAudio PannerNode) + ducking del ambiente.
- [ ] Rate-limit `rl:ai:tts:{account}` (clave reservada, cableado en S2.8).

**DoD:** El Habitante responde con voz audible y espacializada; el ambiente baja de volumen mientras habla; primer audio < ~1.5-2 s.

---

#### OSIA-S2.6-H3 — Visemas y micro-animaciones de relleno

**Como** Residente **quiero** ver los labios del Habitante moverse al hablar **para** que sea creíble y para tapar la latencia.

**Criterios de aceptación:**
- Dado el audio TTS, Entonces el `DialogueResponse` incluye `visemas` y el world-client anima los labios en sincronía.
- Dado que la respuesta tarda, Cuando se espera el primer token/audio, Entonces el Habitante reproduce micro-animaciones diegéticas (ladear la cabeza, gesto de escuchar) como llenadores.

**Tareas técnicas:**
- [ ] Generar/derivar visemas del TTS (o heurística por fonemas si el proveedor no los da).
- [ ] Animación de labios en world-client a partir de visemas.
- [ ] Micro-animaciones de "pensando/escuchando" disparadas al iniciar el trigger.

**DoD:** Los labios se mueven aproximadamente sincronizados con el audio; mientras llega la respuesta hay una micro-animación que ocupa el silencio.

---

## OSIA-S2.7 — Memoria (pgvector) y conciencia del mundo

**Objetivo:** Que los Habitantes recuerden a cada usuario (memoria por par habitante×usuario) en dos niveles (corto plazo por ventana, largo plazo vectorizado con resumen periódico) y que su conciencia del mundo provenga SIEMPRE del `worldSnapshot` autoritativo. Aquí el Habitante deja de ser un chatbot sin memoria y pasa a "conocerte".

**Duración estimada:** 2 semanas.

**Dependencias:** OSIA-S2.5 (pipeline), OSIA-S2.1 (pgvector).

### Historias

---

#### OSIA-S2.7-H1 — Memoria de corto plazo (ventana de conversación)

**Como** Residente **quiero** que el Habitante recuerde lo que dijimos hace unos turnos **para** que la conversación tenga continuidad.

**Criterios de aceptación:**
- Dada una `Conversation` (una por usuario × habitante × sesión) y sus `ConversationTurn`, Entonces el ensamblado incluye una ventana de 6-10 turnos recientes en `messages`.
- Dado un turno nuevo, Entonces se persiste en `ai.conversation_turns` y alimenta la ventana corta.

**Tareas técnicas:**
- [ ] Modelar `Conversation`/`ConversationTurn` en el dominio; abrir/cerrar conversación por sesión.
- [ ] Recuperar la ventana corta (6-10 turnos) e insertarla en `messages` (después de la conciencia del mundo, antes del turno actual).
- [ ] Persistir cada turno (ya iniciado en S2.5-H3).

**DoD:** En una conversación de >10 turnos, el Habitante referencia algo dicho 3-4 turnos atrás; la ventana se trunca correctamente.

---

#### OSIA-S2.7-H2 — Memoria de largo plazo (pgvector, recall kNN)

**Como** Residente **quiero** que el Habitante recuerde hechos míos de sesiones anteriores **para** que sienta que me conoce.

**Criterios de aceptación:**
- Dado un job async post-respuesta (Haiku, fuera del camino crítico), Cuando un turno termina, Entonces extrae hechos salientes y los persiste como `InhabitantMemory` (content + embedding + salience), por par (inhabitant_id, user_id).
- Dado un turno nuevo, Cuando se ensambla el contexto, Entonces se recuperan las memorias kNN top 3-5 filtradas por `(inhabitant_id, user_id)` y se insertan en `messages`.
- Dado el recall, Entonces usa el índice HNSW (`vector_cosine_ops`) — verificado con `EXPLAIN`.

**Tareas técnicas:**
- [ ] Adapter de embeddings (pgvector 1536d) en `infrastructure`.
- [ ] Job async de extracción de memoria con Haiku (post-respuesta, no bloquea la latencia percibida).
- [ ] Recall kNN top-K filtrado por par; insertar memorias en el bloque de `messages`.
- [ ] Salience/poda: marcar relevancia; preparar poda de memorias viejas (ejecutada por cron en S2.9).

**DoD:** Tras una sesión donde el usuario dice un hecho ("me gusta la lluvia"), en una sesión posterior el Habitante lo recuerda; el recall usa el índice HNSW.

**Notas:** Memoria POR PAR (habitante, usuario) — no global. El borrado de cuenta debe purgar embeddings en cascada (cubierto en S2.8/doc 09).

---

#### OSIA-S2.7-H3 — Resumen periódico (rolling summary)

**Como** Dev **quiero** un resumen rodante de la conversación **para** mantener contexto largo sin inflar tokens.

**Criterios de aceptación:**
- Dado un umbral (cada 12-15 turnos), Cuando se alcanza, Entonces un job (Haiku) genera un resumen rodante que sustituye parte del historial corto en futuros ensamblados.
- Dado el resumen, Entonces reduce el consumo de tokens manteniendo coherencia.

**Tareas técnicas:**
- [ ] Job de resumen periódico (Haiku) cada 12-15 turnos; persistir el resumen.
- [ ] Insertar el resumen en lugar del historial antiguo en el ensamblado.

**DoD:** En conversaciones largas, el conteo de tokens de entrada se mantiene acotado gracias al resumen; coherencia preservada.

---

#### OSIA-S2.7-H4 — Conciencia del mundo desde el worldSnapshot autoritativo

**Como** Residente **quiero** que el Habitante hable del mundo real (atardecer, lluvia, evento) **para** que no haya ruptura entre la atmósfera y el diálogo.

**Criterios de aceptación:**
- Dado el trigger, Entonces el `worldSnapshot` adjunto (hora/ciclo desde `AtmosphereState`, clima desde `WeatherCycle`, estación, evento efímero activo desde `AtmosphereEvent`, presencia: quién está en la sala) proviene del world-server autoritativo — NUNCA de una hora local del AI Service.
- Dado el ensamblado, Entonces la conciencia del mundo se inyecta en `messages` (no en `system`).
- Dado un atardecer/tormenta/evento activo, Entonces el Habitante puede comentarlo con precisión (el guía menciona el atardecer; el narrador anuncia la lluvia de meteoros).

**Tareas técnicas:**
- [ ] El world-server adjunta el `worldSnapshot` al `triggerDialogue` (forma definida en S2.1-H3).
- [ ] Inyectar la conciencia del mundo en `messages` antes de las memorias y el historial.
- [ ] Trigger de evento (`triggerDialogue` tipo "de evento") que pasa el evento activo al narrador.

**DoD:** Con lluvia activa, el Habitante comenta la lluvia correctamente; al ocurrir un meteoro, el narrador lo anuncia; la hora que menciona coincide con la del mundo (no la del servidor de IA).

**Notas:** Esta es la pieza que evita la "ruptura atmósfera↔diálogo". Misma verdad que ven los humanos = inmersión.

---

## OSIA-S2.8 — Guardarrailes de costo, moderación, fallback offline y kill-switch

**Objetivo:** Convertir el costo de IA en algo **acotado por arriba y atado al engagement**: rate-limit (usuario + global), presupuesto diario de tokens (80%/100%), kill-switch de presupuesto mensual (~15 USD) que degrada a líneas pre-escritas, cache de respuestas, moderación de salida en personaje, y manejo de `refusal`. Sin esto, un bug o un día intenso podría quemar el runway.

**Duración estimada:** 1-2 semanas.

**Dependencias:** OSIA-S2.5, S2.6, S2.7 (todo el pipeline de IA).

### Historias

---

#### OSIA-S2.8-H1 — Rate-limit (usuario + global) y presupuesto diario de tokens

**Como** Dev/Operador **quiero** límites duros de uso y un presupuesto diario **para** que el gasto de IA nunca se dispare.

**Criterios de aceptación:**
- Dado Redis, Entonces existen token buckets `rl:ai:turn:{account}`, `rl:ai:stt:{account}`, `rl:ai:tts:{account}` (por usuario) y un límite global; un Guard NestJS `@RateLimit('ai:turn', 20, '1h')` los aplica.
- Dado el presupuesto diario `budget:ai:{account}:{yyyymm}` y `budget:ai:global:{yyyymm}` (contabilizado desde `usage` de cada respuesta), Cuando se cruza el 80%, Entonces se fuerza Haiku para todo; al 100%, se activa el modo offline.
- Dado el world-server, Entonces limita chat/movimiento in-process (límites in-process, separados de los de IA).

**Tareas técnicas:**
- [ ] Implementar NestJS RateLimit Guard sobre Redis (token bucket/sliding window vía Lua atómico).
- [ ] Contadores de presupuesto en Redis (por cuenta + global mensual) alimentados por `usage` de Claude.
- [ ] Umbral 80% → `pickModel` fuerza Haiku; 100% → modo offline (fallback).
- [ ] Límite in-process de chat/movimiento en el world-server.

**DoD:** Superar 20 turnos/h por cuenta devuelve 429 controlado; al cruzar el 80% del presupuesto todo cae a Haiku; al 100% se sirve fallback (verificado simulando consumo).

---

#### OSIA-S2.8-H2 — Cache de respuestas y verificación de prompt-caching

**Como** Dev **quiero** cachear respuestas y verificar el prompt-cache de Anthropic **para** abaratar la charla repetida.

**Criterios de aceptación:**
- Dado un `(persona, intención, atmósfera)` similar, Entonces existe un cache de respuestas en Redis con TTL corto que evita re-llamar a Claude para relleno trivial.
- Dado el prompt-cache de Anthropic, Entonces se audita que `cache_read_input_tokens > 0` entre turnos y se detectan invalidadores silenciosos.

**Tareas técnicas:**
- [ ] Cache de respuestas en Redis por `(persona, intención, atmósfera)` con TTL corto.
- [ ] Telemetría de cache hit ratio (Anthropic + Redis) a /metrics.
- [ ] Auditoría de invalidadores de prompt-cache (prefijo estable, JSON ordenado).

**DoD:** El cache de respuestas sirve relleno sin llamar a Claude (verificado); cache hit ratio de Anthropic visible en métricas y > 0.

---

#### OSIA-S2.8-H3 — Fallback offline en personaje

**Como** Residente **quiero** que el Habitante siga "en personaje" aunque la IA falle o se agote el presupuesto **para** que la experiencia nunca se rompa.

**Criterios de aceptación:**
- Dado un disparador (rate-limit, presupuesto agotado, error/timeout de Whisper/Claude/TTS, `stop_reason: "refusal"`), Cuando ocurre, Entonces se sirve una línea pre-escrita por persona, coherente con la atmósfera y el mood, desde el banco de fallback (10-20 líneas/persona tagueadas por mood).
- Dado el modo offline, Entonces el Habitante responde con líneas pre-escritas sin coste de IA.

**Tareas técnicas:**
- [ ] Banco de líneas de fallback por persona (en `inhabitant_personas`, tagueadas por mood) — escribir 10-20 por persona.
- [ ] Detección de disparadores y selección de línea coherente con `worldSnapshot`/mood.
- [ ] Conectar con el kill-switch (S2.8-H4) y los umbrales de presupuesto.

**DoD:** Forzando rate-limit/timeout/refusal, el Habitante responde con una línea pre-escrita coherente; cero llamadas a IA en modo offline.

---

#### OSIA-S2.8-H4 — Kill-switch de presupuesto mensual + alertas

**Como** Dev/Operador **quiero** un kill-switch que degrade los Habitantes al cruzar el presupuesto mensual **para** proteger el runway y enterarme.

**Criterios de aceptación:**
- Dado un presupuesto global mensual (~15 USD umbral), Cuando se cruza, Entonces el kill-switch degrada automáticamente a respuestas scriptadas/cacheadas y dispara una alerta a Discord.
- Dado el kill-switch, Entonces es reversible (config/feature flag) y queda registrado en `AuditLog`.

**Tareas técnicas:**
- [ ] Contador `budget:ai:global:{yyyymm}` con umbral configurable; FeatureFlag para forzar/quitar el kill-switch.
- [ ] Degradación automática a fallback al cruzar el umbral.
- [ ] Alerta a canal Discord `#alerts` vía webhook.
- [ ] Registrar activación en `AuditLog`.

**DoD:** Simulando gasto que cruza el umbral, los Habitantes pasan a scriptados y llega alerta a Discord; al bajar el contador/quitar el flag, vuelven a IA.

---

#### OSIA-S2.8-H5 — Moderación de salida en personaje, manejo de `refusal` y auditoría

**Como** Dev/Operador **quiero** moderar la salida de IA y auditar cada turno **para** proteger la marca de lujo y la seguridad.

**Criterios de aceptación:**
- Dado el system prompt blindado por persona (boundaries explícitos) y la moderación de input/output, Cuando un output cruza un umbral, Entonces se sirve un fallback elegante en personaje (no un mensaje de error de moderación crudo).
- Dado `stop_reason: "refusal"`, Cuando ocurre, Entonces se maneja como fallback (no se lee `content` ciegamente).
- Dada la salida, Entonces se sanitiza antes de pasar al TTS.
- Dado cada turno, Entonces se audita en `AuditLog` con el `request_id` de Anthropic.

**Tareas técnicas:**
- [ ] System prompts blindados por `InhabitantPersona`; moderación de input/output (capa ligera).
- [ ] Manejo de `stop_reason: "refusal"` → fallback en personaje.
- [ ] Sanitización de salida previa al TTS.
- [ ] Auditar cada turno en `AuditLog` con `anthropic_request_id`.

**DoD:** Un input adversario (prompt-injection) no rompe la persona ni filtra el system; un `refusal` cae a fallback en personaje; cada turno queda auditado con su `request_id`.

**Notas de seguridad:** Esta historia cierra la superficie de riesgo de IA (doc 09): input nunca en system, boundaries por persona, refusal manejado, salida sanitizada, auditoría. Es requisito de DoD de fase.

---

## OSIA-S2.9 — Integración Mundo Vivo, métricas, persistencia y pulido

**Objetivo:** Coser todo, instrumentar las métricas de la fase, implementar el checkpoint/reanudación de atmósfera, la poda de memorias y el borrado de cuenta en cascada, y pulir la experiencia hasta el entregable demostrable. Esta es la "última milla" que convierte piezas en una fase lanzable.

**Duración estimada:** 1-2 semanas.

**Dependencias:** Todos los sprints anteriores.

### Historias

---

#### OSIA-S2.9-H1 — Integración extremo a extremo y guion de la demo

**Como** Residente **quiero** una sesión completa donde todo encaja **para** vivir el "esto está vivo".

**Criterios de aceptación:**
- Dado el flujo completo, Cuando dos amigos entran, Entonces: ven la atmósfera viva y sincronizada, los Habitantes deambulan y reaccionan al clima, conversan por voz/texto con respuesta encarnada y memoria, y presencian un evento efímero anunciado por el narrador.
- Dado el guion de demo (helper de evento forzado por seed), Entonces se reproduce el entregable demostrable de principio a fin sin errores.

**Tareas técnicas:**
- [ ] Pruebas de integración del flujo completo (trigger→Whisper→contexto→Claude→TTS→difusión).
- [ ] Afinar latencias (primer token < ~1.5 s, primer audio < ~2 s en Haiku) con micro-animaciones de relleno.
- [ ] Guion reproducible de demo con evento forzado para la grabación.

**DoD:** Se graba el video de ~5 min del entregable en staging/prod sin fallos; latencias dentro de objetivo.

---

#### OSIA-S2.9-H2 — Métricas, dashboards y alertas de la fase

**Como** Dev/Operador **quiero** medir lo que importa de Fase 2 **para** decidir con datos y vigilar el gasto.

**Criterios de aceptación:**
- Dado /metrics, Entonces expone: conversaciones IA/sesión, costo IA/sesión (microcents), gasto IA del mes, latencia primer token/primer audio, cache hit ratio, % de eventos efímeros con ≥1 testigo, tick rate, conexiones WS.
- Dadas las alertas, Entonces llegan a Discord `#alerts` para: gasto IA cruzando umbrales, world-server caído, error rate alto, DB > 400MB.

**Tareas técnicas:**
- [ ] Instrumentar contadores Redis + endpoint /metrics (gasto IA, latencias, cache, eventos con testigo).
- [ ] Integrar Sentry (web/world-client/api) con source maps.
- [ ] Alertas a Discord vía webhook (gasto, caída, error rate, DB).
- [ ] Health-check del proyecto Supabase (evitar pausa por inactividad) y del world-server.

**DoD:** Dashboard/endpoint muestra las métricas de la fase con datos reales de una sesión; una alerta de prueba llega a Discord.

---

#### OSIA-S2.9-H3 — Checkpoint/reanudación de atmósfera y poda de memorias

**Como** Dev/Operador **quiero** que el cielo se reanude tras un reinicio y que las memorias no inflen la DB **para** continuidad y sostenibilidad en el free tier.

**Criterios de aceptación:**
- Dado el world-server, Cuando corre, Entonces hace checkpoint periódico de `atmosphere_states.epoch_tick` (cadence definido en S2.1-H2); al reiniciar, reanuda el mismo punto del ciclo.
- Dado un scheduler (cron), Entonces programa los `atmosphere_events` con índice parcial `scheduled` y poda/resume memorias IA viejas para mantener la DB bajo el límite free (400MB trigger).

**Tareas técnicas:**
- [ ] Implementar el job de checkpoint periódico de `atmosphere_states` en el world-server.
- [ ] Cron de programación de `atmosphere_events` (alinear con `scheduleEvents`).
- [ ] Cron de poda/resumen de memorias viejas; verificar tamaño de DB.
- [ ] Purgador/hard-delete por retención de `conversation_turns`/`audit_logs` por partición.

**DoD:** Reiniciar el world-server reanuda el cielo en el punto correcto; la poda corre y mantiene la DB bajo control; eventos programados por cron coinciden con `scheduleEvents`.

---

#### OSIA-S2.9-H4 — Privacidad: borrado de cuenta en cascada y retención

**Como** Residente **quiero** poder borrar mi cuenta de verdad **para** confiar en el ecosistema; **como** Operador **quiero** cumplir privacidad por arquitectura.

**Criterios de aceptación:**
- Dado un borrado de cuenta, Cuando se ejecuta, Entonces purga en cascada los datos del usuario incluyendo `inhabitant_memories`/embeddings asociados a ese usuario.
- Dado el audio de voz humana, Entonces nunca se grabó (P2P) y el audio crudo de STT ya se descartó tras transcribir (verificado en S2.6).
- Dada la retención, Entonces `conversation_turns`/`audit_logs`/`presence_sessions` se purgan por partición según política.

**Tareas técnicas:**
- [ ] Caso de uso de borrado de cuenta con cascada (incl. memorias/embeddings por usuario).
- [ ] Confirmar cero retención de audio crudo de STT y de voz P2P.
- [ ] Políticas de retención por partición (purgador cron).

**DoD:** Borrar una cuenta de prueba elimina sus memorias/embeddings y datos asociados (verificado en DB); confirmada la no retención de audio.

---

## 4. Riesgos de la fase (transversales) y mitigaciones

| Riesgo | Impacto | Mitigación | Sprint |
|---|---|---|---|
| **Gasto de IA se dispara** (bug, día intenso, prompt-injection que fuerza Opus) | Quema el runway de ~250 USD | Tiering Haiku-default, `max_tokens=220`, rate-limit usuario+global, presupuesto diario 80/100%, kill-switch mensual ~15 USD, cache de respuestas + prompt-cache | S2.5, S2.8 |
| **Cache de Anthropic no pega** (invalidador silencioso) | Costo/latencia se disparan sin avisar | Prefijo estable con `cache_control`, input siempre en `messages`, auditar `cache_read_input_tokens > 0`, JSON ordenado, set de personas estable | S2.5-H2, S2.8-H2 |
| **Ruptura atmósfera↔diálogo** (el Habitante menciona una hora distinta a la del cielo) | Rompe la inmersión, el pilar #1 | `worldSnapshot` autoritativo siempre desde el world-server; nunca hora local del AI Service | S2.7-H4 |
| **Determinismo roto** (cliente y servidor divergen en atmósfera/eventos) | El cielo "salta", los eventos no coinciden | `resolveAtmosphere`/`scheduleEvents` puros y deterministas (PRNG sembrado, prohibir `Math.random` por lint), contrato versionado en `shared` | S2.2, S2.1-H3 |
| **Latencia de voz percibida alta** | Conversación se siente robótica | Streaming de Claude y TTS, primer token/audio < objetivo, micro-animaciones de relleno, STT con timeout corto y caída a texto | S2.5-H3, S2.6 |
| **Prompt-injection / salida fuera de marca** | Riesgo directo a la marca de lujo | Input nunca en system, boundaries por persona, moderación in/out, `refusal` → fallback en personaje, sanitización pre-TTS, AuditLog | S2.8-H5 |
| **DB free tier se llena** (memorias/embeddings/turnos) | Supabase se degrada/pausa | Poda/resumen de memorias, particiones con retención, embeddings 1536d sobrios, alerta a 400MB | S2.7, S2.9-H3 |
| **Mundo se siente vacío si entra uno solo** | Falla el North Star de la fase | Habitantes con presencia garantizada + locomoción ambiental + reacción al clima (todo $0 IA) sostienen el mundo aun sin segundo usuario | S2.4 |
| **Pérdida de continuidad tras reinicio** | El cielo "salta", se siente frágil | Checkpoint de `atmosphere_states.epoch_tick` + reanudación | S2.1-H2, S2.9-H3 |

---

## 5. Notas de rendimiento y seguridad (transversales)

**Rendimiento:**
- Partículas de lluvia/meteoros con InstancedMesh y object pooling; sin asignaciones en el hot path (doc 08).
- Atmósfera difundida solo en cambios (compacta); en reposo, ancho de banda despreciable.
- Memoria: embeddings 1536d, recall kNN top-K acotado, índice HNSW; resumen rodante para no inflar tokens.
- IA fuera del hot path donde se pueda: extracción de memoria y resumen son jobs async post-respuesta (no afectan la latencia percibida); candidatos a Batches API (-50%) cuando el volumen lo justifique (Fase 3+).
- El world-server avanza atmósfera en el paso 6 del tick con métricas por tick; nada de I/O bloqueante en el bucle.

**Seguridad/privacidad:**
- Toda llamada a Claude/Whisper/TTS pasa por `apps/api` (proxy); el cliente nunca llama a los proveedores directo (claves solo server-side en Hetzner).
- Input de usuario siempre en `messages`, nunca en `system`; boundaries explícitos por persona; instrucciones a mitad de sesión vía `role:system` en `messages`.
- Voz humana↔humano P2P/mesh, nunca toca el servidor ni se graba; audio crudo de STT descartado tras transcribir.
- `stop_reason: "refusal"` manejado como fallback; salida sanitizada antes del TTS; cada turno auditado con `request_id` de Anthropic en `AuditLog`.
- Validación con Zod (en `shared`) en cliente y servidor; el AI Service valida el cuerpo del mensaje antes de procesar.
- Borrado de cuenta = purga real en cascada incluyendo embeddings de `inhabitant_memories`.
