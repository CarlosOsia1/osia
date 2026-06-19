# Backlog de Sprints — Fase 5+ · Hacia Gigante

> Propósito: Backlog ejecutable de la Fase 5+ de OSIA (escala: plots propios, escasez/invitaciones avanzadas, apertura más allá de amigos, economía cosmética que paga servidores, más biomas/portales, SFU mediasoup, migración Supabase→Hetzner, hardening y observabilidad de producción) | Estado: Borrador v1 | Fecha: 2026-06-19 | Parte del paquete de diseño OSIA.

Documentos hermanos: ver [../00-vision-alcance.md](../00-vision-alcance.md), [../03-arquitectura-sistema.md](../03-arquitectura-sistema.md), [../04-modelo-datos-er.md](../04-modelo-datos-er.md), [../05-realtime-mundo-networking.md](../05-realtime-mundo-networking.md), [../06-motor-atmosfera.md](../06-motor-atmosfera.md), [../07-habitantes-ia.md](../07-habitantes-ia.md), [../08-estrategia-rendimiento.md](../08-estrategia-rendimiento.md), [../09-seguridad-infra-costos.md](../09-seguridad-infra-costos.md), [../10-contratos-api-eventos.md](../10-contratos-api-eventos.md), [../11-glosario-dominio.md](../11-glosario-dominio.md).

---

## 1. Contexto y objetivo de la fase

Las Fases 0–4 construyeron en profundidad **El Mundo** (atmósfera, presencia, habitantes IA), **El Vestíbulo + identidad** (pasaporte/SSO), **La Red Social** (apps/social) y **Los Juegos** (apps/games). OSIA ya es un ecosistema vivo para un círculo de invitados.

La Fase 5+ es **el arco largo: pasar de "diminuto y perfecto" a "gigante sin perder el alma"**. Aquí OSIA gana las mecánicas que (a) hacen que el mundo **te pertenezca** (plots/terrenos propios editables y visitables), (b) convierten la **escasez en motor de crecimiento controlado** (invitaciones avanzadas, waitlist con promoción, apertura más allá de amigos por oleadas), (c) **pagan los servidores** (economía cosmética con moneda virtual y tienda, sin pay-to-win), y (d) sostienen la escala técnica (**SFU mediasoup** para voz en eventos grandes, **migración de Supabase a Hetzner self-host**, hardening y observabilidad de producción con Sentry + Prometheus/Grafana).

> **Disciplina de la fase:** esto NO es construir amplitud de golpe. Cada superficie ya existe; la Fase 5+ profundiza ownership, escasez y sostenibilidad. La economía se enciende **solo cuando hay valor** (engagement real). La migración de infra se hace **detrás de los adapters hexagonales** (R8 del doc 00), sin reescribir dominio. Nada se enciende "por si acaso": cada gasto/escala atado a un trigger métrico.

### Principios rectores de la fase

| Principio | Aplicación en Fase 5+ |
|---|---|
| El arte de lo esencial | La tienda es curada y escasa, no un bazar; los plots son pocos y bellos, no infinitos. |
| Escasez por diseño | Plots limitados por zona; cosméticos con rareza (incl. tier `celestial`); cupo de invitaciones; oleadas de apertura. |
| Costo correcto | La economía cosmética genera ingreso que cubre Hetzner; la migración self-host baja costo variable a escala. |
| Anti pay-to-win | Moneda virtual compra **solo** cosméticos/estética/espacio, nunca ventaja competitiva ni puntos de ranking. |
| Modular / depth-first | Plots, economía y apertura son aditivos a bounded contexts existentes (`world`, `economy`, `identity`); no hay kernel nuevo. |
| Server-authoritative | Ownership, balance de moneda, claim de plots y compras se escriben **solo** server-side (anti-fraude por contrato). |

---

## 2. Definition of Done de la FASE

La Fase 5+ se considera **terminada y lanzable** cuando:

1. **Plots propios end-to-end:** un Residente puede reclamar (claim) un Plot disponible en una Zona, editarlo (colocar/mover/quitar props de un catálogo curado), guardarlo persistente, y otro Residente puede visitarlo vía Portal; el ownership respeta `plot_ownerships` (un solo owner activo por índice parcial único) y soporta co-anfitriones.
2. **Economía cosmética viva:** existe una moneda virtual (PopularityPoints/saldo) con `reputation_ledger` append-only como fuente de verdad y `economy.transactions` con `idempotency_key`; hay una **Tienda** que vende Cosmetics (con rareza), compras idempotentes server-side, inventario (`inventory_items`) y equipar/desequipar; **nunca** se vende ventaja de juego.
3. **Escasez/invitaciones avanzadas:** cupo de invitaciones por Account, waitlist con promoción por oleadas (`/v1/admin/waitlist` + promote), invitaciones con expiración/revocación, cuarentena suave de cuentas nuevas, y métricas de viralidad (invitaciones enviadas/usadas por usuario).
4. **Apertura más allá de amigos:** flag de fase de apertura (FeatureFlag) que habilita oleadas controladas (invite-tree, k-factor observable), con rate-limit y anti-abuso reforzado, sin romper el invite-only como gate.
5. **Más biomas/zonas/portales:** al menos 2 biomas nuevos con sus presets de atmósfera (datos, no código) y zonas conectadas por portales con preload predictivo; pipeline de assets (`packages/assets`) genera LOD/impostores para los nuevos biomas.
6. **Voz a escala (SFU):** `VoiceTransport` conmuta de mesh P2P a **SFU mediasoup** cuando una instancia supera el umbral (>6 hablantes / eventos), desplegado en Hetzner, con fallback a mesh; sin grabación de voz humana (privacidad por arquitectura intacta).
7. **Migración Supabase→Hetzner self-host:** Postgres (+pgvector), Auth-equivalente y Storage migrados a Hetzner detrás de los **mismos ports hexagonales**, con plan de rollback probado y cero pérdida de datos; los adapters cambian, el dominio no.
8. **Producción endurecida y observable:** Sentry en web/world-client/api con source maps; Prometheus + Grafana con dashboards (fps p95, tick rate, bytes/tick, gasto IA mensual, conexiones WS, error rate, tamaño DB, latencia REST p95); alertas a Discord `#alerts`; backups/DR con runbook y restore probado.
9. **Presupuestos de rendimiento sostenidos** con los nuevos biomas y plots editables: 60 fps desktop / 30 mobile; draw calls ≤150/80; VRAM ≤1GB/350MB; red ≤1.5KB/tick (medido, no estimado) — ver [../08-estrategia-rendimiento.md](../08-estrategia-rendimiento.md).
10. **Runway sostenible:** la economía cosmética cubre el costo de Hetzner + IA del mes (objetivo: ingreso cosmético ≥ gasto fijo+variable), verificado con el dashboard de costos.

### Entregable demostrable

Un recorrido grabado/en vivo donde: un Residente **reclama un Plot**, lo **edita y publica**, un amigo lo **visita por portal**; ambos **compran un cosmético** en la tienda con moneda virtual y lo **equipan**; entran a un **evento con SFU** (>6 voces) en un **bioma nuevo**; un invitado nuevo entra por una **oleada de apertura** desde la waitlist; todo corriendo sobre **Postgres self-host en Hetzner** con **Grafana** mostrando los presupuestos en verde y el **gasto cubierto por ingresos cosméticos**.

---

## 3. Mapa de sprints

> Dimensionados para **un dev solo**, ~1–2 semanas cada uno. Orden pensado para minimizar riesgo: primero ownership de plots (alto valor, bajo riesgo de infra), luego economía (paga servidores), luego apertura/escasez, luego escala técnica dura (SFU + migración), y cierre con hardening/observabilidad y lanzamiento.

| Sprint | Título | Duración | Depende de |
|---|---|---|---|
| OSIA-S5.1 | Cimientos de Plots: dominio, claim y persistencia | 2 sem | Fases 0–4 |
| OSIA-S5.2 | Editor de Plots y visita por portal | 2 sem | S5.1 |
| OSIA-S5.3 | Economía cosmética: moneda, ledger y transacciones | 1–2 sem | Fase 4 (economy schema), S5.1 |
| OSIA-S5.4 | Tienda y cosméticos: catálogo, compra, inventario, equipar | 2 sem | S5.3 |
| OSIA-S5.5 | Escasez avanzada: invitaciones, waitlist por oleadas, cuarentena | 1–2 sem | Fase 1 (identity) |
| OSIA-S5.6 | Apertura controlada más allá de amigos (k-factor, anti-abuso) | 1–2 sem | S5.5 |
| OSIA-S5.7 | Biomas y zonas nuevas + pipeline de assets a escala | 2 sem | Fase 0/2 (atmósfera, terreno) |
| OSIA-S5.8 | Voz a escala: SFU mediasoup + conmutación mesh↔SFU | 2 sem | Fase 0 (VoiceTransport) |
| OSIA-S5.9 | Migración Supabase → Hetzner self-host (DB/Auth/Storage) | 2 sem | S5.3, adapters hexagonales |
| OSIA-S5.10 | Hardening de producción + observabilidad (Sentry/Prometheus/Grafana) | 1–2 sem | todos |
| OSIA-S5.11 | Backups/DR, runbooks, sostenibilidad de runway y lanzamiento de fase | 1 sem | S5.9, S5.10 |

Total estimado: ~18–20 semanas para un dev solo.

---

## OSIA-S5.1 · Cimientos de Plots: dominio, claim y persistencia

- **Objetivo:** habilitar que un Residente reclame un Plot disponible en una Zona y que el ownership sea persistente, server-authoritative y con soporte multi-owner (co-anfitriones) según el modelo `plot_ownerships`.
- **Duración:** 2 semanas.
- **Dependencias:** schema `world` base (Fases 0–2), `economy` parcial (Fase 4), SSO/identidad (Fase 1).

### Historias

#### OSIA-S5.1-H1 — Reclamar un Plot disponible
**Como** Residente **quiero** reclamar un Plot libre en una Zona **para** tener un espacio propio dentro del Mundo.

**Criterios de aceptación**
- Dado un Plot con estado disponible (sin owner activo), cuando llamo `POST /v1/zones/{zoneId}/plots/{plotId}/claim` con `Idempotency-Key`, entonces se crea un `plot_ownerships` con `role='owner'`, `revoked_at IS NULL` y `account_id = auth.uid()`.
- Dado un Plot ya reclamado, cuando otro Residente intenta el claim, entonces recibe `409` `PLOT_ALREADY_OWNED` y el índice parcial único `uq_plot_single_owner` lo garantiza a nivel DB.
- Dado un Residente que excede su cupo de plots, cuando intenta claim, entonces recibe `403` `PLOT_QUOTA_EXCEEDED`.
- La operación es idempotente: reintento con la misma `Idempotency-Key` devuelve el mismo resultado sin doble escritura.

**Tareas técnicas**
- [ ] Migración `YYYYMMDD__NNNN_world_plots_claim.sql`: confirmar/crear `plots`, `plot_ownerships` con índice parcial `uq_plot_single_owner (plot_id) WHERE role='owner' AND revoked_at IS NULL`; `claimable`/`status` y `zone_id` FK.
- [ ] Bounded context `world` en apps/api (NestJS hexagonal): caso de uso `ClaimPlot` en `application`, port out `PlotRepositoryPort`, adapter Supabase en `infrastructure`.
- [ ] Endpoint REST `POST /v1/zones/{zoneId}/plots/{plotId}/claim` con guard de auth + `Idempotency-Key` obligatorio (conectado a mecanismo de idempotencia del doc 10).
- [ ] DTO + schema Zod `ClaimPlotInput`/`PlotView` en `packages/shared/rest/dto`.
- [ ] Cupo de plots por Account vía FeatureFlag/config (`PLOT_QUOTA_DEFAULT`), validado en dominio.
- [ ] RLS: política de lectura de plots para `authenticated`; escritura solo service-side (el claim pasa por apps/api).
- [ ] Evento de dominio `world.plot.claimed` en el catálogo de `packages/shared/catalog/events`.

**DoD:** claim funciona end-to-end, idempotente, con doble-defensa (DB + dominio); test de concurrencia (dos claims simultáneos → uno gana, otro `409`); evento emitido.

---

#### OSIA-S5.1-H2 — Co-anfitriones (multi-owner) y revocación
**Como** Anfitrión **quiero** invitar co-anfitriones a mi Plot y poder revocarlos **para** construir/curar mi espacio con amigos.

**Criterios de aceptación**
- Dado que soy owner activo, cuando agrego un co-anfitrión (`role='editor'`), entonces se crea una fila en `plot_ownerships` sin violar el índice de owner único.
- Dado un co-anfitrión activo, cuando lo revoco, entonces se setea `revoked_at` (soft, append-friendly) y pierde permisos de edición inmediatamente.
- Solo el owner puede transferir ownership o revocar; un editor no puede.

**Tareas técnicas**
- [ ] Endpoints `POST /v1/plots/{plotId}/owners` (invitar), `DELETE /v1/plots/{plotId}/owners/{accountId}` (revocar) según doc 10.
- [ ] Caso de uso `AddPlotCollaborator` / `RevokePlotCollaborator` con verificación de rol owner.
- [ ] Modelo de permisos de plot (owner > editor) en dominio; mapeo a `plot_ownerships.role`.
- [ ] Auditoría: registrar add/revoke en `audit_logs`.

**DoD:** multi-owner funciona; revocación inmediata; solo owner gestiona; auditado.

---

#### OSIA-S5.1-H3 — Persistencia del estado del Plot (layout)
**Como** Sistema **quiero** persistir el layout editable de cada Plot **para** que sobreviva reinicios del world-server y sea reconstruible al visitar.

**Criterios de aceptación**
- Dado un Plot con props colocados, cuando el world-server reinicia, entonces al re-instanciar la room del plot se reconstruye el layout desde Postgres.
- El layout se guarda como agregado versionado (no frame por frame): el world-server persiste **agregados**, no cada tick (frontera Postgres/Redis del doc 04).

**Tareas técnicas**
- [ ] Migración `world.plot_layouts` (o columna `jsonb` versionada en `plots`): `plot_id`, `version`, `layout jsonb`, `updated_at` (+ trigger `set_updated_at`).
- [ ] Port `PlotLayoutRepositoryPort` + adapter; caso de uso `SavePlotLayout`/`LoadPlotLayout`.
- [ ] Contrato de layout (`PlotLayout`: lista de instancias de prop con `assetId`, posición cuantizada, rotación, escala) en `packages/shared`.
- [ ] Validación Zod del layout (límites de props por plot → presupuesto de rendimiento e instancing).

**DoD:** layout persiste y se reconstruye; límite de props enforced; versionado.

**Riesgos / notas**
- *Rendimiento:* limitar props por plot (presupuesto de draw calls; usar `InstancedMesh` para repetición) — ver doc 08. Definir `PLOT_MAX_PROPS` por tier.
- *Seguridad:* todo claim/edición server-authoritative; el cliente propone, el servidor dispone.

---

## OSIA-S5.2 · Editor de Plots y visita por portal

- **Objetivo:** dar al Anfitrión un editor in-world para componer su Plot con un catálogo curado de props, y permitir que otros lo visiten por Portal con preload predictivo.
- **Duración:** 2 semanas.
- **Dependencias:** OSIA-S5.1.

### Historias

#### OSIA-S5.2-H1 — Editor in-world de colocación de props
**Como** Anfitrión **quiero** colocar, mover, rotar y quitar props de un catálogo curado **para** diseñar mi espacio.

**Criterios de aceptación**
- Dado que estoy en mi Plot como owner/editor, cuando entro en modo edición, entonces veo un HUD diegético con el catálogo curado (paleta de marca) y un retículo de colocación.
- Cuando coloco/muevo un prop, entonces el cambio se valida server-side (límites de props, área del plot) y se difunde a otros editores presentes.
- Cuando supero `PLOT_MAX_PROPS`, entonces se bloquea la colocación con feedback elegante (no error técnico).
- El centro de pantalla permanece sagrado; la UI de edición respeta el HUD minimalista del design system.

**Tareas técnicas**
- [ ] Modo edición en `apps/world-client` (R3F): herramientas mover/rotar/escala con `@react-three/rapier` para snapping al terreno; usar `InstancedMesh` por clase de prop.
- [ ] Catálogo curado de props en `packages/assets` con manifiesto LOD (GLTF→Meshopt/Draco, KTX2+mipmaps); paleta de marca.
- [ ] Mensajes WS de edición (frío, msgpack): `PLOT_EDIT_PLACE`/`PLOT_EDIT_MOVE`/`PLOT_EDIT_REMOVE` (nuevos opcodes en `packages/shared/net/opcodes`, espejo en doc 05/10) validados server-side antes de tocar simulación.
- [ ] Componentes HUD de edición en `packages/ui/hud` (paleta, prompt de interacción) consistentes con el design system.
- [ ] Autosave (debounce) → `SavePlotLayout`; indicador de guardado.

**DoD:** edición fluida, validada server-side, difundida a co-editores, dentro de presupuesto de rendimiento.

---

#### OSIA-S5.2-H2 — Publicar y visitar un Plot por Portal
**Como** Residente **quiero** visitar el Plot de un amigo cruzando un Portal **para** ver su espacio.

**Criterios de aceptación**
- Dado un Plot publicado, cuando cruzo su Portal, entonces se orquesta `leave+join` con `sessionTicket` de corta vida y fundido de marca (continuidad percibida), reconstruyendo el layout persistido.
- Dado un Plot privado (no publicado/sin permiso), cuando intento entrar, entonces recibo `403` `PLOT_ACCESS_DENIED` validado por el world-server (autoridad espacial).
- El destino se precarga (preload predictivo por portal) para evitar pop-in.

**Tareas técnicas**
- [ ] Estado `published` en `plots`; endpoint `POST /v1/plots/{plotId}/publish`.
- [ ] Room type `plot` en world-server (capacidad/persistencia por tipo, doc 05): instanciar plot bajo demanda y reconstruir layout.
- [ ] Validación de acceso/cercanía de portal en world-server (anti-cheat gratis por autoridad).
- [ ] Preload predictivo: el Portal emite prefetch hint hacia los assets del plot destino (doc 08).
- [ ] `PORTAL_GRANT` extendido para destinos de tipo plot.

**DoD:** visita funciona con fundido de marca, acceso validado server-side, sin pop-in perceptible.

**Riesgos / notas**
- *Rendimiento:* un plot muy poblado puede romper presupuestos; aplicar `disposeScene` al salir (fugas de VRAM = bug #1) y dynamic resolution si cae el fps. Test de fugas entrar/salir 20×.
- *Seguridad:* validar cada mensaje de edición con Zod en world-server; clamp de posiciones para evitar props fuera del área.

---

## OSIA-S5.3 · Economía cosmética: moneda, ledger y transacciones

- **Objetivo:** establecer la moneda virtual (saldo derivado del `reputation_ledger` append-only) y el motor de transacciones idempotentes server-authoritative, base de la tienda. Sin pay-to-win.
- **Duración:** 1–2 semanas.
- **Dependencias:** schema `economy` (Fase 4), identidad.

### Historias

#### OSIA-S5.3-H1 — Saldo de moneda virtual derivado de ledger append-only
**Como** Residente **quiero** consultar mi saldo de moneda virtual **para** saber qué puedo adquirir.

**Criterios de aceptación**
- Dado mi historial de eventos en `reputation_ledger` (append-only), cuando consulto `GET /v1/economy/balance`, entonces recibo un saldo calculado como fuente de verdad event-sourced (no un contador mutable suelto).
- `profiles.popularity_points`/`reputation` son **cache derivado** recalculado por trigger desde el ledger; nunca la fuente de verdad.
- El cliente **lee** balance/ledger, **nunca** los escribe (anti-cheat por contrato, doc 10).

**Tareas técnicas**
- [ ] Migración: confirmar `economy.reputation_ledger` (append-only: `account_id`, `delta`, `reason`, `ref_id`, `created_at`) y trigger de recálculo de cache en `profiles`.
- [ ] Endpoints `GET /v1/economy/balance` y `GET /v1/economy/ledger` (paginación cursor `Page<T>`).
- [ ] Caso de uso `GetBalance`/`GetLedger` en bounded context `economy`.
- [ ] Enum `LedgerReason` en `packages/shared/domain/enums` (espejo de los CHECK del ER): `event_attendance`, `purchase`, `grant`, `refund`, etc.

**DoD:** balance correcto y derivado; ledger paginado; cliente solo lectura; cache recalculado por trigger.

---

#### OSIA-S5.3-H2 — Transacciones idempotentes server-side
**Como** Sistema **quiero** registrar transacciones con `idempotency_key` único **para** que ninguna compra/crédito se duplique.

**Criterios de aceptación**
- Dado un débito/crédito, cuando se ejecuta `economy.transactions` con `idempotency_key`, entonces un reintento con la misma clave no duplica el efecto (`idempotency_key UNIQUE`).
- Dado saldo insuficiente, cuando se intenta un débito, entonces falla con `402`/`409` `INSUFFICIENT_BALANCE` sin escribir ledger.
- Toda transacción escribe `reputation_ledger` y `transactions` en una **única transacción Postgres** (atomicidad).

**Tareas técnicas**
- [ ] Migración: `economy.transactions` con `idempotency_key UNIQUE`, FK a cosmetic/ref.
- [ ] Caso de uso `ExecuteTransaction` (débito/crédito atómico, port `LedgerRepositoryPort`).
- [ ] Mecanismo de idempotencia (doc 10) conectado a `transactions.idempotency_key`.
- [ ] Tests de concurrencia (doble compra simultánea → un solo débito).

**DoD:** transacciones atómicas e idempotentes; saldo insuficiente bloqueado; auditado.

**Riesgos / notas**
- *Seguridad:* economía escrita **solo** server-side; sin endpoint de acreditación desde cliente (igual que scores). Registrar en `audit_logs` movimientos de tipo `grant`/`refund`.
- *Diseño:* la moneda compra **solo** estética/espacio. Documentar invariante "no pay-to-win" como contract test (ningún cosmético afecta `scores`/`leaderboard`).

---

## OSIA-S5.4 · Tienda y cosméticos: catálogo, compra, inventario, equipar

- **Objetivo:** abrir La Tienda — catálogo curado de Cosmetics con rareza, compra idempotente, inventario y equipar/desequipar, dentro de la estética de lujo. Es la pieza que **paga los servidores**.
- **Duración:** 2 semanas.
- **Dependencias:** OSIA-S5.3.

### Historias

#### OSIA-S5.4-H1 — Catálogo de cosméticos con rareza
**Como** Residente **quiero** explorar la Tienda con cosméticos curados **para** elegir qué adquirir.

**Criterios de aceptación**
- Dado el catálogo, cuando llamo `GET /v1/cosmetics`, entonces recibo cosméticos con `slug` natural, `rarity` (incl. tier `celestial`), precio en moneda virtual y disponibilidad.
- Los cosméticos respetan la paleta de marca (champán/ónix/marfil/taupe); escasez real (ediciones limitadas/temporales).
- Un cosmético de evento (asistencia a evento efímero) **no es comprable** ni grindeable (estatus puro).

**Tareas técnicas**
- [ ] Migración: confirmar `economy.cosmetics` (`slug`, `rarity`, `price`, `availability`, `kind`).
- [ ] Endpoint `GET /v1/cosmetics` (filtros por rareza/tipo, paginación cursor).
- [ ] Enum `CosmeticRarity` (incl. `celestial`) y `CosmeticKind` en `packages/shared`.
- [ ] UI de Tienda en `apps/web` (o superficie correspondiente) editorial, no bazar; componentes del design system.
- [ ] Seed idempotente de cosméticos iniciales.

**DoD:** catálogo curado con rareza, precios y escasez; UI de lujo; cosméticos de evento excluidos de compra.

---

#### OSIA-S5.4-H2 — Comprar cosmético (idempotente)
**Como** Residente **quiero** comprar un cosmético con mi saldo **para** poseerlo.

**Criterios de aceptación**
- Dado saldo suficiente, cuando llamo `POST /v1/cosmetics/{slug}/purchase` con `Idempotency-Key`, entonces se debita el saldo (vía `ExecuteTransaction`), se crea `inventory_items` (`uq_inventory_unique` evita duplicados) y se acredita propiedad.
- Dado saldo insuficiente, entonces `402 INSUFFICIENT_BALANCE` sin efecto.
- Dado un cosmético agotado/no disponible, entonces `409 COSMETIC_UNAVAILABLE`.
- Reintento con misma `Idempotency-Key` no duplica la compra.

**Tareas técnicas**
- [ ] Endpoint `POST /v1/cosmetics/{slug}/purchase` (Idempotency-Key obligatorio, doc 10).
- [ ] Caso de uso `PurchaseCosmetic`: valida disponibilidad → `ExecuteTransaction` (débito) → crea `inventory_items` → ledger `reason='purchase'`, todo atómico.
- [ ] `uq_inventory_unique (account_id, cosmetic_id)` para no duplicar propiedad.
- [ ] Evento `economy.cosmetic.purchased`.
- [ ] Rate-limit Redis `rl:purchase:{account}` (doc 09).

**DoD:** compra atómica e idempotente; inventario sin duplicados; límites de disponibilidad respetados.

---

#### OSIA-S5.4-H3 — Inventario y equipar/desequipar
**Como** Residente **quiero** equipar mis cosméticos **para** expresar mi estatus en el Pasaporte y en el Mundo.

**Criterios de aceptación**
- Dado mi inventario, cuando llamo `GET /v1/inventory/me`, entonces veo mis ítems con estado equipado/no.
- Cuando equipo/desequipo (`POST /v1/inventory/{itemId}/equip` / `unequip`), entonces el cambio se refleja en el avatar/pasaporte y se difunde a presencia (otros me ven con el cosmético).
- Solo puedo equipar lo que poseo; un slot exclusivo equipa uno a la vez.

**Tareas técnicas**
- [ ] Endpoints `GET /v1/inventory/me`, `POST /v1/inventory/{itemId}/equip|unequip`.
- [ ] Casos de uso `EquipCosmetic`/`UnequipCosmetic` con regla de slots exclusivos.
- [ ] Reflejar cosmético equipado en el `ProfileBrief`/snapshot de avatar que viaja por presencia (world-server difunde apariencia).
- [ ] Evento `economy.cosmetic.equipped`.
- [ ] UI: pasaporte/avatar muestran cosmético equipado (design system).

**DoD:** equipar/desequipar funciona; solo lo poseído; visible para otros vía presencia.

**Riesgos / notas**
- *Diseño/marca:* mantener la tienda escasa y curada — el riesgo es volverla genérica (rompe "el arte de lo esencial"). Contención: pocas piezas, alta calidad, rotación.
- *Seguridad:* validar propiedad server-side antes de equipar; no confiar en el cliente.
- *Contract test:* ningún cosmético modifica stats de juego (invariante no-pay-to-win).

---

## OSIA-S5.5 · Escasez avanzada: invitaciones, waitlist por oleadas, cuarentena

- **Objetivo:** profundizar la mecánica de escasez como motor de crecimiento controlado: cupo de invitaciones, waitlist con promoción por oleadas, invitaciones con expiración/revocación, cuarentena suave de cuentas nuevas, y métricas de viralidad.
- **Duración:** 1–2 semanas.
- **Dependencias:** contexto `identity` (Fase 1).

### Historias

#### OSIA-S5.5-H1 — Cupo de invitaciones escaso por Account
**Como** Residente **quiero** un cupo limitado de invitaciones **para** que invitar sea un acto de estatus y la comunidad crezca curada.

**Criterios de aceptación**
- Dado mi cupo (~3 por Account, configurable por FeatureFlag), cuando emito invitaciones, entonces se consume cupo y al agotarse `403 INVITE_QUOTA_EXCEEDED`.
- El cupo de larga vida se persiste (RateLimitBucket en Postgres para límites duraderos, doc 09); los intentos por IP usan Redis `rl:invite:{ip}`.
- Una Invitation tiene expiración y puede revocarse antes de usarse.

**Tareas técnicas**
- [ ] Endpoints `/v1/invitations` (GET listar, POST emitir, revoke) según doc 10.
- [ ] Caso de uso `IssueInvitation`/`RevokeInvitation` con verificación de cupo.
- [ ] `system.rate_limit_buckets` para cupo persistente de invitaciones; FeatureFlag `INVITE_QUOTA`.
- [ ] Invitaciones con `expires_at`; estado usado/expirado/revocado.
- [ ] Evento `identity.invitation.redeemed` / `identity.invitation.issued`.
- [ ] `InvitationCard` (design system) con estados ceremoniales.

**DoD:** cupo enforced y persistente; expiración/revocación; UI ceremonial.

---

#### OSIA-S5.5-H2 — Waitlist con promoción por oleadas
**Como** Dev/Operador **quiero** promover entradas de la waitlist por oleadas **para** abrir el acceso de forma controlada y generar FOMO.

**Criterios de aceptación**
- Dado un `WaitlistEntry`, cuando un operador llama `POST /v1/admin/waitlist/{id}/promote`, entonces se genera una Invitation y se notifica al usuario.
- La promoción puede hacerse en lote (oleada de N personas).
- Solo `moderator`/admin (claim de rol) puede promover; `authenticated` normal no.

**Tareas técnicas**
- [ ] Endpoints `/v1/admin/waitlist` (GET con filtros) + `promote` (single y batch).
- [ ] Caso de uso `PromoteWaitlistEntry` (crea Invitation, dispara notificación/email vía smtp-service).
- [ ] Autorización por rol `moderator`/admin (RLS + guard).
- [ ] Métrica: tamaño de waitlist, tasa de conversión promoción→cuenta.
- [ ] Evento `identity.waitlist.promoted`.

**DoD:** promoción single y batch; solo admin; conversión instrumentada.

---

#### OSIA-S5.5-H3 — Cuarentena suave de cuentas nuevas + métricas de viralidad
**Como** Sistema **quiero** limitar a la mitad las acciones de cuentas nuevas durante 24h y medir el k-factor **para** mitigar abuso y entender el crecimiento.

**Criterios de aceptación**
- Dada una cuenta con <24h, cuando actúa (posts, chat, invitaciones, compras), entonces sus límites son la mitad de lo normal.
- Métricas de viralidad disponibles: invitaciones enviadas/usuario, usadas/usuario, k-factor (invitados que activan / invitador), conversión invitación→cuenta→1ª sesión.

**Tareas técnicas**
- [ ] Guard de cuarentena: detectar `account.created_at < now()-24h` y aplicar límites reducidos en el RateLimit Guard (Redis).
- [ ] Pipeline de métricas: contadores en `audit_logs`/eventos de dominio → dashboard (precursor de S5.10).
- [ ] Definir k-factor y exponerlo en panel admin.

**DoD:** cuarentena activa primeras 24h; métricas de viralidad calculadas y visibles.

**Riesgos / notas**
- *Seguridad:* la escasez es también defensa anti-abuso; cuidar que la cuarentena no degrade la primera experiencia de un invitado legítimo (mantener wow del minuto 1).

---

## OSIA-S5.6 · Apertura controlada más allá de amigos

- **Objetivo:** habilitar oleadas de apertura más allá del círculo inicial sin romper el invite-only, con árbol de invitaciones, anti-abuso reforzado y un FeatureFlag de fase de apertura.
- **Duración:** 1–2 semanas.
- **Dependencias:** OSIA-S5.5.

### Historias

#### OSIA-S5.6-H1 — FeatureFlag de fase de apertura por oleadas
**Como** Dev/Operador **quiero** controlar la apertura con un FeatureFlag **para** abrir gradualmente y poder cerrar si algo se desborda.

**Criterios de aceptación**
- Dado el flag `OPENING_WAVE` (off por defecto), cuando lo activo con un cupo de oleada, entonces se habilita un número limitado de nuevos signups desde waitlist/invite-tree.
- Dado que la oleada llena su cupo, entonces nuevos signups quedan en waitlist automáticamente.
- El gate invite-only **nunca** se desactiva: signUp sigue requiriendo Invitation válida server-side.

**Tareas técnicas**
- [ ] `system.feature_flags` con flag `OPENING_WAVE` (cupo, ventana temporal).
- [ ] Gate en `POST /v1/auth/signup` que respeta cupo de oleada + Invitation válida.
- [ ] Panel admin para abrir/cerrar oleada y ver progreso.
- [ ] Evento `identity.opening_wave.started`/`closed`.

**DoD:** apertura por oleadas controlable; invite-only intacto; auto-waitlist al llenarse.

---

#### OSIA-S5.6-H2 — Árbol de invitaciones (invite-tree) y anti-abuso reforzado
**Como** Sistema **quiero** rastrear quién invitó a quién y reforzar anti-abuso **para** crecer sano y poder podar abusos en cascada.

**Criterios de aceptación**
- Dada una redención de invitación, cuando se crea la cuenta, entonces se registra `inviter_account_id` (arista del invite-tree).
- Dado un abuso detectado en una rama, entonces se puede suspender/podar la sub-rama (revisión manual + herramienta admin).
- Anti-abuso reforzado: Cloudflare WAF/Bot Fight + rate-limit de borde en `/api/auth/*` + Redis (doc 09).

**Tareas técnicas**
- [ ] Columna `inviter_account_id` en `accounts` (FK self) → invite-tree.
- [ ] Consulta de sub-árbol (recursiva) para auditoría/poda.
- [ ] Herramienta admin de suspensión en cascada (con confirmación y `audit_logs`).
- [ ] Endurecer rate-limit de signup/login (Cloudflare borde + Redis), Origin allowlist.

**DoD:** invite-tree registrado; poda en cascada disponible; anti-abuso reforzado y auditado.

**Riesgos / notas**
- *Seguridad:* la apertura aumenta superficie de ataque; reforzar moderación de IA (doc 07/09) y reuse-detection de refresh tokens. Monitorear error rate y signups anómalos (alerta a `#alerts`).

---

## OSIA-S5.7 · Biomas y zonas nuevas + pipeline de assets a escala

- **Objetivo:** ampliar el Mundo con ≥2 biomas nuevos (datos, no código) y zonas conectadas por portales, manteniendo presupuestos de rendimiento con el pipeline de `packages/assets` (LOD, impostores, KTX2).
- **Duración:** 2 semanas.
- **Dependencias:** motor de atmósfera (Fase 0/2), terreno/streaming (doc 08).

### Historias

#### OSIA-S5.7-H1 — Presets de atmósfera para biomas nuevos
**Como** Residente **quiero** que cada bioma nuevo tenga su atmósfera distintiva **para** que el Mundo se sienta vasto sin ser genérico.

**Criterios de aceptación**
- Dado un bioma nuevo, cuando entro, entonces el motor resuelve sus `AtmospherePreset` (datos) sin tocar el código del motor.
- Los presets pasan el linter de paleta house-celestial en CI (no rompen la identidad de marca).
- La transición entre biomas es suave (interpolada), nunca un snap.

**Tareas técnicas**
- [ ] Autorar ≥2 biomas con sus presets en `packages/atmosphere` (datos): p.ej. costa crepuscular, altiplano brumoso.
- [ ] Verificar gamut con el linter de presets en GitHub Actions (doc 06).
- [ ] `AtmosphereState.biome` y resolución por capas (eje bioma) ya soportada; añadir datos.
- [ ] Traductor `AtmosphereParams`→render en world-client (niebla/postFX por bioma).

**DoD:** ≥2 biomas con atmósfera propia; linter en verde; transiciones suaves.

---

#### OSIA-S5.7-H2 — Zonas nuevas con terreno LOD e impostores
**Como** Sistema **quiero** generar terreno por chunks con LOD e impostores para los biomas nuevos **para** sostener fps con más mundo.

**Criterios de aceptación**
- Dada una zona nueva, cuando la recorro, entonces el terreno usa geo-clipmap por chunks (anillos 0–3), impostores/billboards para lo lejano y niebla que oculta el pop-in.
- Los presupuestos se mantienen: draw calls ≤150/80, VRAM ≤1GB/350MB, 60/30 fps.
- Los LOD/impostores se generan **offline** en `packages/assets`, nunca en runtime.

**Tareas técnicas**
- [ ] Manifiestos de zona (chunks + LOD de terreno + posiciones de props para instancing).
- [ ] Pipeline `packages/assets`: simplify (gltf-transform) + bake de impostores + KTX2(BC7/ASTC/ETC2)+mipmaps por clase de asset.
- [ ] `asset_manifests` sincronizado con `cdn_base_url` (Cloudflare R2).
- [ ] Streaming de chunks on-demand priorizado por distancia/mirada; fade-in 0.3–0.5s acoplado a niebla.
- [ ] Performance budget test (headless) en CI para las zonas nuevas.

**DoD:** zonas nuevas dentro de presupuesto; LOD/impostores offline; budget test en verde.

---

#### OSIA-S5.7-H3 — Portales entre zonas con preload predictivo
**Como** Residente **quiero** viajar entre zonas/biomas por portales **para** explorar el Mundo sin esperas ni pop-in.

**Criterios de aceptación**
- Dado un portal entre zonas, cuando me acerco, entonces se precargan los assets del destino (prefetch hint).
- Al cruzar, el `leave+join` orquestado con fundido de marca mantiene continuidad percibida.

**Tareas técnicas**
- [ ] `portals` entre las zonas nuevas; `PORTAL_GRANT` con destino zona.
- [ ] Preload predictivo por portal (doc 08); medir tiempo a primer frame del destino.
- [ ] Verificar AOI/interest management con más entidades por zona.

**DoD:** viaje entre zonas fluido con preload; sin pop-in perceptible.

**Riesgos / notas**
- *Rendimiento:* más mundo = más riesgo de fugas de VRAM; reforzar `disposeScene` y test de fugas por zona. Reemplazar números "objetivo" por mediciones reales (doc 08).

---

## OSIA-S5.8 · Voz a escala: SFU mediasoup + conmutación mesh↔SFU

- **Objetivo:** soportar voz en grupos grandes/eventos conmutando de mesh P2P a SFU mediasoup cuando una instancia supera el umbral, sin romper la privacidad (voz humana nunca se graba).
- **Duración:** 2 semanas.
- **Dependencias:** `VoiceTransport` abstracto (Fase 0), coturn en Hetzner.

### Historias

#### OSIA-S5.8-H1 — Desplegar SFU mediasoup en Hetzner
**Como** Dev/Operador **quiero** un SFU mediasoup desplegado **para** mezclar voz de grupos grandes sin saturar el ancho de banda de los clientes.

**Criterios de aceptación**
- Dado el SFU corriendo, cuando ≥7 personas hablan en una instancia, entonces el audio se enruta vía SFU (1 envío + N recepciones) en lugar de mesh (N×N).
- La voz humana **no se graba** ni persiste (cero retención) — privacidad por arquitectura intacta.
- El SFU corre en Docker en Hetzner; secrets solo server-side.

**Tareas técnicas**
- [ ] Servicio mediasoup (Node) dockerizado en Hetzner; puertos RTP/ICE; coturn TURN fallback.
- [ ] Routers/producers/consumers de mediasoup; signaling reutilizando el WS (mensajes `VOICE_SIGNAL`).
- [ ] Sin grabación: garantizar que ningún stream toca disco/DB.
- [ ] IaC en `infra/` (compose + scripts deploy).

**DoD:** SFU operativo; enrutamiento N personas; sin retención; desplegado por IaC.

---

#### OSIA-S5.8-H2 — Conmutación automática mesh↔SFU con fallback
**Como** Sistema **quiero** elegir mesh o SFU según el tamaño del grupo **para** minimizar costo en grupos chicos y escalar en eventos.

**Criterios de aceptación**
- Dado un grupo ≤6, cuando hablan, entonces usa mesh P2P (costo ~0).
- Dado un grupo >6 / evento, cuando se cruza el umbral `VOICE_SFU_THRESHOLD`, entonces conmuta a SFU sin cortar la conversación (transición suave).
- Dado fallo del SFU, entonces hay fallback a mesh para grupos que aún caben.

**Tareas técnicas**
- [ ] Implementar selección en la interfaz `VoiceTransport` (mesh ↔ SFU) detrás del mismo contrato.
- [ ] Umbral `VOICE_SFU_THRESHOLD` (FeatureFlag) y lógica de conmutación en el world-server (coordina señalización).
- [ ] Banco de pruebas de NAT y de conmutación en caliente.
- [ ] Métricas: # de instancias en SFU, jitter/latencia de voz.

**DoD:** conmutación transparente; mesh para chico, SFU para grande; fallback probado.

**Riesgos / notas**
- *Costo/infra:* el SFU consume CPU/ancho de banda en Hetzner; activarlo solo sobre el umbral (costo correcto). Dimensionar CX22→CX32 reactivo por métrica si los eventos lo exigen.
- *Privacidad:* test explícito de "no grabación".

---

## OSIA-S5.9 · Migración Supabase → Hetzner self-host (DB/Auth/Storage)

- **Objetivo:** migrar Postgres (+pgvector), Auth-equivalente y Storage de Supabase a Hetzner self-host **detrás de los mismos ports hexagonales**, bajando costo variable a escala, con rollback probado y cero pérdida de datos (mitiga R8 del doc 00).
- **Duración:** 2 semanas.
- **Dependencias:** adapters hexagonales estables; economía (S5.3) y datos consolidados.

### Historias

#### OSIA-S5.9-H1 — Postgres + pgvector self-host en Hetzner
**Como** Dev/Operador **quiero** Postgres self-host con pgvector **para** dejar de depender del free tier de Supabase al escalar.

**Criterios de aceptación**
- Dado el Postgres self-host (Docker en Hetzner), cuando apunto los adapters de `infrastructure` a la nueva conexión, entonces el dominio funciona sin cambios (solo cambia el adapter/connection string).
- pgvector con índice HNSW migra y `inhabitant_memories` recupera kNN correctamente.
- La migración se hace con `pg_dump`/restore verificado; checksum de filas por tabla coincide.

**Tareas técnicas**
- [ ] Provisionar Postgres + extensiones (`pgcrypto`, `citext`, `vector`, `uuidv7`/nativa) en Hetzner Docker.
- [ ] Migrar schemas por bounded context (forward-only) + datos (`pg_dump`); verificar conteos/embeddings.
- [ ] Repuntar adapters Supabase→Postgres self-host (solo `infrastructure`); env/secrets en Doppler.
- [ ] Reaplicar RLS/políticas o sustituir por autoridad de apps/api donde aplique.

**DoD:** Postgres self-host operativo; pgvector kNN OK; datos verificados; dominio intacto.

---

#### OSIA-S5.9-H2 — Auth y Storage self-host equivalentes
**Como** Sistema **quiero** Auth y Storage self-host **para** completar la independencia de Supabase manteniendo el contrato SSO.

**Criterios de aceptación**
- Dado el nuevo backend de Auth, cuando un usuario inicia sesión, entonces el contrato SSO se mantiene: cookie `.osia.com` HttpOnly/Secure/SameSite=Lax + access JWT corto + world ticket de un solo uso (sin cambios para los clientes).
- Storage migra a R2/self-host; URLs de media siguen el flujo de URL prefirmada (apps/api solo guarda la URL).
- El JWT sigue verificándose por firma localmente en el world-server (JWKS/secret), sin tocar DB en el camino caliente.

**Tareas técnicas**
- [ ] Sustituir Supabase Auth por adapter de auth self-host (emisión/refresh de tokens, verificación de email) detrás del port `AuthPort`.
- [ ] Mantener `password_hash` y verificación de email; reuse-detection de refresh.
- [ ] Migrar Storage a Cloudflare R2 (ya en uso para assets) / self-host; URLs prefirmadas.
- [ ] Actualizar verificación JWT del world-server (clave/JWKS del nuevo emisor).

**DoD:** SSO equivalente con clientes sin cambios; Storage migrado; JWT verificado por firma.

---

#### OSIA-S5.9-H3 — Rollback probado y corte controlado
**Como** Dev/Operador **quiero** un plan de migración con rollback **para** migrar sin riesgo de pérdida de datos.

**Criterios de aceptación**
- Dado el ensayo de migración, cuando ejecuto el corte (cutover), entonces hay ventana de mantenimiento documentada y un rollback a Supabase probado en staging.
- Cero pérdida de datos: doble verificación de conteos/checksums antes y después.

**Tareas técnicas**
- [ ] Runbook de cutover (freeze de escrituras, dump final, restore, repunte de DNS/secrets, verificación, descongelar).
- [ ] Ensayo completo en staging (`*.osia.localhost`/staging) antes de prod.
- [ ] Script de rollback y criterios de abortar.

**DoD:** cutover ensayado; rollback probado; verificación de integridad documentada.

**Riesgos / notas**
- *Riesgo alto (R8):* esta es la operación más delicada de la fase. Mitigación: adapters hexagonales (cambio aislado), ensayo en staging, ventana de mantenimiento, backups inmutables previos. No hacer en viernes; tener el runbook impreso.

---

## OSIA-S5.10 · Hardening de producción + observabilidad

- **Objetivo:** llevar OSIA a estándar de producción: Sentry, Prometheus/Grafana con dashboards y alertas, security headers/CORS/WAF reforzados, kill-switch de costo IA verificado.
- **Duración:** 1–2 semanas.
- **Dependencias:** todos los sprints previos (instrumenta lo construido).

### Historias

#### OSIA-S5.10-H1 — Sentry en web/world-client/api con source maps
**Como** Dev/Operador **quiero** captura de errores con stack legible **para** diagnosticar incidentes en producción.

**Criterios de aceptación**
- Dado un error en cualquier app, cuando ocurre, entonces Sentry lo captura con source maps (stack legible) y `requestId` de Pino correlacionado.
- Datos sensibles redactados (Pino + Sentry scrubbing).

**Tareas técnicas**
- [ ] Integrar Sentry SDK en `apps/web`, `apps/world-client`, `apps/api`; subir source maps en CI.
- [ ] Correlación `requestId` Pino ↔ Sentry; scrubbing de PII.
- [ ] Filtro de excepciones global de NestJS que emite `ApiError` con `requestId` (doc 10).

**DoD:** errores capturados con source maps y correlación; PII redactada.

---

#### OSIA-S5.10-H2 — Prometheus + Grafana: dashboards de presupuestos
**Como** Dev/Operador **quiero** dashboards de métricas clave **para** ver salud y presupuestos de un vistazo.

**Criterios de aceptación**
- Dado el dashboard, cuando lo abro, entonces veo: fps p95 (cliente), tick rate del world-server, bytes/tick, conexiones WS, gasto IA mensual (Redis), error rate, tamaño de DB, latencia REST p95, # instancias en SFU.
- Cada presupuesto del doc 08/09 tiene su panel y umbral visual.

**Tareas técnicas**
- [ ] Endpoint `/metrics` (Prometheus) en apps/api y world-server (tick rate, conexiones, rate-limit hits, gasto IA).
- [ ] Exportar métricas de cliente (fps, render scale) a un colector.
- [ ] Desplegar Prometheus + Grafana (Docker en Hetzner, IaC en `infra/`); dashboards versionados.
- [ ] Paneles de presupuesto (fps, draw calls vía budget test, VRAM, bytes/tick, costo IA, DB size).

**DoD:** dashboards operativos con todos los presupuestos; métricas server y cliente.

---

#### OSIA-S5.10-H3 — Alertas a Discord + kill-switch de costo IA verificado
**Como** Dev/Operador **quiero** alertas automáticas y kill-switch de IA **para** no despertar a una sorpresa de costos o caída.

**Criterios de aceptación**
- Dado un umbral cruzado (gasto IA mensual ~$15, world-server caído, error rate alto, DB >400MB), cuando ocurre, entonces llega alerta a Discord `#alerts`.
- Dado el presupuesto global de IA cruzado, cuando se alcanza, entonces el kill-switch degrada NPCs a respuestas scriptadas/cacheadas automáticamente (verificado con prueba).

**Tareas técnicas**
- [ ] Alertmanager/webhooks → Discord `#alerts` para cada umbral.
- [ ] Verificar kill-switch de costo IA (doc 09): forzar presupuesto y comprobar degradación a fallback.
- [ ] Reforzar security headers (HSTS/CSP/nosniff/frame DENY/Permissions-Policy mic=self), CORS allowlist, Cloudflare WAF/Bot Fight para superficie ampliada por la apertura.
- [ ] Health-checks (world-server, Supabase/Postgres) con alerta.

**DoD:** alertas funcionando; kill-switch probado; headers/WAF reforzados; health-checks activos.

**Riesgos / notas**
- *Costo:* con apertura + economía + IA + SFU el gasto variable sube; los dashboards y alertas son el control. Validar ids/precios de modelos Claude (Haiku/Opus) con la skill `claude-api` antes de fijar umbrales definitivos.

---

## OSIA-S5.11 · Backups/DR, runbooks, sostenibilidad de runway y lanzamiento de fase

- **Objetivo:** cerrar la fase con backups/DR probados, runbooks operativos, verificación de que la economía cubre el runway, y lanzamiento de la Fase 5+.
- **Duración:** 1 semana.
- **Dependencias:** OSIA-S5.9, OSIA-S5.10.

### Historias

#### OSIA-S5.11-H1 — Backups/DR con restore probado
**Como** Dev/Operador **quiero** backups automáticos y un restore probado **para** sobrevivir a una pérdida de datos.

**Criterios de aceptación**
- Dado el cron de backup, cuando corre, entonces hay `pg_dump` semanal a R2 + snapshots de Hetzner; Redis no se respalda (se reconstruye).
- Dado un ensayo de DR, cuando restauro desde backup en un entorno limpio, entonces los datos vuelven íntegros y el restore está cronometrado en el runbook.

**Tareas técnicas**
- [ ] Cron de `pg_dump` semanal a R2 (post-migración self-host); rotación/retención.
- [ ] Snapshots Hetzner semanales; restart policy `unless-stopped` en Docker.
- [ ] Ensayo de restore documentado (tiempo objetivo de recuperación).
- [ ] Purgador/retención: hard-delete de soft-deleted, poda de `audit_logs`/`conversation_turns`/`presence_sessions` por partición.

**DoD:** backups automáticos; restore probado y cronometrado; retención activa.

---

#### OSIA-S5.11-H2 — Sostenibilidad de runway (economía paga servidores)
**Como** Dev/Operador **quiero** verificar que el ingreso cosmético cubre el gasto **para** confirmar que OSIA es sostenible al escalar.

**Criterios de aceptación**
- Dado el dashboard de costos, cuando reviso el mes, entonces el ingreso por cosméticos ≥ (Hetzner fijo + IA variable + SFU).
- Existe un panel de "salud financiera" con ingreso cosmético vs gasto.

**Tareas técnicas**
- [ ] Métrica de ingreso cosmético (suma de transacciones `purchase`) vs gasto (Hetzner + IA Redis budget + ancho SFU).
- [ ] Panel Grafana "runway" con objetivo verde/rojo.
- [ ] Alerta si gasto > ingreso por 2 meses (revisión de modelo).

**DoD:** panel de runway operativo; objetivo de cobertura visible y alertado.

---

#### OSIA-S5.11-H3 — Documentación, runbooks y lanzamiento de la Fase 5+
**Como** Dev/Operador **quiero** runbooks y un checklist de lanzamiento **para** operar y abrir la fase con confianza.

**Criterios de aceptación**
- Dado el lanzamiento, cuando se ejecuta el checklist, entonces se verifican: plots end-to-end, tienda con compra real, oleada de apertura, SFU en evento, self-host estable, dashboards en verde.
- Runbooks operativos disponibles (cutover, kill-switch IA, restore DR, escalado CX22→CX32, conmutación SFU).
- Se actualiza el glosario/ADRs si se introdujo terminología nueva (plot layout, oleada de apertura, etc.).

**Tareas técnicas**
- [ ] Runbooks en `infra/`/`docs` (auto-mitigantes: kill-switch, restart, escalado reactivo).
- [ ] Checklist de lanzamiento de fase (smoke test del entregable demostrable).
- [ ] Actualizar `packages/shared` (enums/eventos nuevos) y glosario (doc 11); plantilla de PR exige entrada de glosario para términos nuevos.
- [ ] Comunicación GTM de la apertura (landing/waitlist/Discord, FOMO de oleada).

**DoD:** runbooks completos; checklist verde; glosario/contratos actualizados; fase lanzada.

**Riesgos / notas**
- *Marca:* la apertura más allá de amigos es el momento de mayor riesgo de diluir "el arte de lo esencial"; mantener oleadas pequeñas, escasez real y curaduría. Lo enorme empieza diminuto y perfecto — escalar sin perder el alma.

---

## 4. Matriz de riesgos de la fase

| Riesgo | Impacto | Sprint | Mitigación |
|---|---|---|---|
| Migración self-host con pérdida de datos | Crítico | S5.9 | Adapters hexagonales, ensayo en staging, rollback probado, checksums, ventana de mantenimiento. |
| Economía percibida como pay-to-win | Alto (marca) | S5.3–S5.4 | Invariante "solo cosméticos/espacio" como contract test; nada toca scores/leaderboard. |
| Apertura diluye la exclusividad/marca | Alto | S5.6 | Oleadas pequeñas, escasez real, curaduría, FeatureFlag con cierre rápido. |
| Costo variable se dispara (IA+SFU+apertura) | Alto | S5.8, S5.10 | Kill-switch IA, SFU solo sobre umbral, dashboards+alertas, panel de runway. |
| Plots editables rompen presupuestos de fps/VRAM | Medio | S5.1–S5.2, S5.7 | `PLOT_MAX_PROPS`, InstancedMesh, dispose, budget test en CI, dynamic resolution. |
| Superficie de ataque crece con la apertura | Medio | S5.6, S5.10 | WAF/Bot Fight, rate-limit reforzado, reuse-detection, moderación IA, auditoría. |
| Abuso de invitaciones / fraude de economía | Medio | S5.5, S5.3 | Cupo escaso, cuarentena 24h, idempotencia, invite-tree con poda en cascada. |

## 5. Trazabilidad con la constitución

- **Plots/ownership** → entidades `Plot`, `plot_ownerships` (multi-owner, índice parcial único); doc 04 §plots.
- **Economía cosmética** → `Cosmetic`, `InventoryItem`, `reputation_ledger` (append-only), `transactions` (idempotency_key); docs 04/10; no pay-to-win (doc 00).
- **Escasez/apertura** → `Invitation`, `WaitlistEntry`, `FeatureFlag`, cuarentena, k-factor; docs 00/09.
- **Biomas/zonas** → `AtmospherePreset` (datos), terreno LOD/impostores, `asset_manifests`; docs 06/08.
- **SFU** → `VoiceTransport` mesh↔SFU mediasoup; doc 05; privacidad sin grabación (doc 09).
- **Migración self-host** → ports hexagonales, R8; docs 00/03/09.
- **Observabilidad** → Sentry, Prometheus/Grafana, alertas Discord, kill-switch IA; doc 09.

> Todo lo de esta fase es **aditivo** a bounded contexts existentes (`world`, `economy`, `identity`, `system`) y al catálogo declarativo de experiencias. No se introduce kernel de launcher. La amplitud emerge; el alma se conserva.
