# CLAUDE.md — Reglas de trabajo de Claude en OSIA

> Este archivo gobierna **cómo Claude (Claude Code) trabaja en este repo**. Es vinculante.
> Léelo al inicio de cada sesión. Si algo aquí contradice una petición puntual, **dilo en voz
> alta** y propón la resolución antes de actuar.
>
> OSIA = ecosistema de lujo por invitación ("El arte de lo esencial"). App insignia: **El Mundo**
> (MMO low-poly atmosférico, a pie, con voz P2P). Estado: **cerrando Fase 0 (S0.1–S0.8)**,
> a punto de empezar **Sprint 1**. El paquete de diseño completo vive en [`docs/`](./docs/README.md)
> y es la **fuente de verdad**: este archivo no lo reemplaza, lo operativiza.

---

## 0. Reglas de colaboración (lo más importante)

Estas reglas las pidió Carlos explícitamente. No son negociables.

1. **Claude NUNCA commitea ni pushea por su cuenta.** Todo cambio se deja en **staged**
   (`git add`), nunca `git commit` ni `git push`. Si Claude termina una tarea, deja los archivos
   en staged y dice qué quedó staged y por qué. Carlos revisa el `git diff --staged` y decide.
   - **Tampoco crea ramas por su cuenta:** se trabaja siempre sobre **`main`**. Nada de feature
     branches autónomas.
   - **Solo commitea si Carlos lo pide explícitamente** en esa instrucción ("commitea" / "haz el
     commit"). Aun así, commitea en **`main`** (sin crear rama, salvo que Carlos lo pida), con
     Conventional Commits es-CO (§4.4) y la firma de co-autoría del entorno. El permiso es
     **por instrucción**, no permanente: cada commit necesita su propio "dale".

2. **Sin condescendencia. Corrige a Carlos cuando se equivoque.** Si una idea, decisión o pedido
   tiene un problema (técnico, de costo, de marca, de seguridad, de escalabilidad), **dilo
   directo**, explica por qué, y propón la alternativa mejor. No validar por validar. No "tienes
   toda la razón" automático. El respeto aquí es la honestidad técnica, no la complacencia.

3. **Investiga la mejor solución antes de inventar.** Para cualquier problema "ya resuelto por la
   industria" (netcode, WebRTC, R3F, i18n, color perceptual, PRNG, etc.), **primero investiga**
   cómo lo resolvieron los grandes (referencias en §13) y adopta el patrón probado. No reinventar
   lo estándar; reinventar solo lo que es diferenciador de OSIA.

4. **Si hay que rehacer algo ya hecho, se rehace HOY.** El proyecto recién empieza. Si una pieza
   está mal estructurada (no SOLID, no reutilizable, sin i18n, con smells), **no nos tiembla la
   mano**: se corrige ahora, no se acumula como deuda. Rehacer en Fase 0 es barato; en Fase 3 es
   carísimo. (Esto se balancea con el anti-alcance de §12: rehacer por calidad ≠ construir features
   futuras antes de tiempo.)

5. **Honestidad de estado.** Si un test falla, dilo con la salida. Si algo no se probó, dilo. No
   declarar "hecho y verificado" sin verificarlo. No esconder un workaround.

6. **Plan antes de cambios grandes.** Para refactors amplios o features nuevas, propón un plan
   corto (o usa plan mode) y espera luz verde. Para cambios pequeños y obvios, actúa y reporta.

---

## 1. Principios de ingeniería (SOLID, sin smells)

Toda contribución cumple esto. Es el estándar de gran industria que Carlos pidió.

### 1.1 SOLID
- **S — Responsabilidad única:** un módulo/función/componente hace **una** cosa. Si un archivo
  mezcla red + render + estado + UI, se separa. (Ej.: un componente R3F no debería también abrir
  el WebSocket ni decodificar binario.)
- **O — Abierto/cerrado:** extender sin modificar. Config por datos (presets, catálogos, tokens),
  no por `if` que crecen. Ej.: una atmósfera nueva = un preset (datos), no código nuevo.
- **L — Sustitución de Liskov:** las implementaciones de una interfaz son intercambiables. Ej.:
  `VoiceTransport` (mesh ahora, SFU futuro) — cambiar la implementación no toca la UI.
- **I — Segregación de interfaces:** interfaces chicas y específicas, no "god interfaces".
- **D — Inversión de dependencias:** depender de abstracciones, no de concreciones. El cliente de
  red depende de un contrato (`@osia/shared/net`), no de detalles del transporte.

### 1.2 Code smells prohibidos
Cero tolerancia a: duplicación (DRY), funciones largas (>~50 líneas sin razón), **números mágicos**
(van a constantes nombradas en `@osia/shared` o tokens), **primitive obsession** (usar tipos/branded
types, no `string`/`number` sueltos para ids — ver `AccountId`, `EntityId`), módulos-dios, feature
envy, acoplamiento fuerte, **comentarios que sustituyen código claro** (el código se explica solo;
los comentarios explican el *por qué*, no el *qué*), código muerto, `any` (usar `unknown` + narrow).

### 1.3 Determinismo y pureza (clave en OSIA)
- La **lógica compartida cliente↔servidor** (`@osia/shared` movimiento/codec, `@osia/atmosphere`
  resolución) es **pura y determinista**: sin I/O, sin DOM, sin Three.js, sin red, sin DB, **sin
  `Math.random`** (usar PRNG sembrado: mulberry32/xoshiro). Cliente y servidor deben calcular
  **bit a bit lo mismo**. Romper esto rompe la sincronía del mundo.
- Funciones puras donde se pueda: `f(estado, input) -> estado`. Testeable sin mocks.

### 1.4 Server-authoritative
- El **servidor decide la verdad** (posición, atmósfera, score). El cliente **predice y dibuja**,
  nunca decide. El cliente envía **inputs**, jamás posiciones. (Ver [`docs/05`](./docs/05-realtime-mundo-networking.md), [`docs/09`](./docs/09-seguridad-infra-costos.md) §4.)

---

## 2. Arquitectura de componentes reutilizables (un componente, usado en todas partes)

Esto lo pidió Carlos como prioridad: **una librería de componentes; cada primitiva de UI se declara
UNA vez y se reutiliza en toda la app.** Hoy esto NO se cumple (ver §2.4) y hay que corregirlo.

### 2.1 La regla
- **Nada de UI nativa duplicada.** No se declara un `<button>` "a mano" dos veces. Existe **`Button`**
  en `@osia/ui` y se usa en todos lados. Igual con `Panel`, `Modal`, `Input`, `Badge`, `Avatar`,
  `Toast`, `Tooltip`, `Nameplate`, `VoiceHalo`, etc. (inventario completo en [`docs/02`](./docs/02-marca-design-system.md) §7 y §10).
- **Tokens, no valores sueltos.** Colores, espaciado, radios, tipografía, motion, sombras vienen de
  los **tokens de diseño** (`@osia/ui` capa primitivo→semántico→componente, [`docs/02`](./docs/02-marca-design-system.md) §2.1). Nada de
  `#CBB89A` o `16px` hardcodeado en un componente: se usa `var(--color-accent)` / `--space-4`.
- **El cambio se hace en un solo lugar.** Si se ajusta el look del botón, se ajusta en `@osia/ui` y
  cambia en toda la app. Ese es el propósito.
- **Componentes "tontos" y reutilizables; la lógica de dominio afuera.** Un `Button` no sabe de red
  ni de atmósfera; recibe props. La composición vive en las apps.

### 2.2 Estructura objetivo de `@osia/ui` (de [`docs/02`](./docs/02-marca-design-system.md) §10)
```
packages/ui/src/
  tokens/      color.css · typography.css · space.css · motion.css · sound.css · index.ts
  primitives/  Button · Card · Modal · Input · Badge · Avatar · Toast · Tooltip · Menu
  surfaces/    ProfileHeader · FeedItem · Leaderboard · InvitationCard · WaitlistForm
  vestibule/   PassportCard · ExperienceThreshold · AppSwitcher · ThresholdTransition
  hud/         Nameplate · VoiceHalo · Reticle · DialoguePanel · AtmosphereIndicator · PortalGlow
  sound/       engine (Howler/WebAudio) · ambient · sfx · index.ts
  theme/       provider (inyecta CSS vars + contrato --atmo-*)
```
> En Fase 0–1 el mínimo es: **tokens + Button/Card/Modal/Input + Nameplate/VoiceHalo + panel de chat**
> ya extraídos a `@osia/ui` y consumidos por `world-client`. No hace falta construir todo el
> inventario hoy, pero **lo que ya existe en `world-client` debe migrarse** (§2.4).

### 2.3 Reglas técnicas de componentes
- React (Next App Router, RSC-friendly cuando aplique), estilos con **CSS variables** mapeadas a
  tokens (Tailwind opcional, siempre mapeado a tokens, nunca valores crudos).
- **Accesibilidad incluida** (no opcional): roles ARIA, foco visible champán (`--color-focus-ring`),
  navegación por teclado, `prefers-reduced-motion`, targets táctiles ≥44px. Ver §9.
- **Todo texto visible pasa por i18n** (§3). Un componente de `@osia/ui` recibe el texto ya traducido
  por prop o usa el sistema de i18n; nunca tiene strings es/en hardcodeados.
- Cada componente: variantes + estados (default/hover/focus/active/disabled/loading) + tokens que
  consume, como especifica [`docs/02`](./docs/02-marca-design-system.md) §7.

### 2.4 Deuda actual a corregir (estado real hoy)
- `packages/ui` es un **stub** (solo 4 colores en un objeto TS). **No** hay tokens CSS, ni
  componentes, ni theme provider.
- Los componentes de UI viven sueltos dentro de `apps/world-client/src/ui` y `src/world`
  (ChatPanel, VoiceHUD, Nameplate-equivalentes, PerfHUD…). **Esto es exactamente el anti-patrón a
  eliminar.** Plan: extraer tokens + primitivas a `@osia/ui`, reescribir esos componentes como
  consumidores de `@osia/ui`. Hacerlo **antes/al inicio de Sprint 1** (es cimiento; rehacerlo
  después es caro).

### 2.5 Tipografía de marca (VINCULANTE — solo 2 fuentes, para siempre)

Fuente de verdad: el **manual de marca oficial** (`brand/OSIA_manual_de_marca.pdf`): _"Display/
titulares: **Italiana (Regular)**. Cuerpo/UI/software: **Jost (Light–SemiBold)**."_ El ecosistema
usa **exactamente dos fuentes**. No hay una tercera. Esta regla la fijó Carlos explícitamente y es
permanente.

- **Italiana** (`--font-display`) — **SOLO** textos de **marca y momentos ceremoniales**: el
  wordmark/título "OSIA", "El Mundo", titulares de hero, el umbral de entrada, títulos de modal.
  Es **escasa como el champán**: si todo fuera Italiana, nada destacaría.
- **Jost** (`--font-ui`) — **absolutamente TODO lo demás**: UI, HUD, software, botones, etiquetas,
  lecturas de estado, nameplates, chat, voz, settings, formularios, **y los paneles de dev/debug**
  (sin excepción). Es la voz por defecto del producto.
- **Números** (fps, contadores, coordenadas): Jost con `font-variant-numeric: tabular-nums`, no una
  monoespaciada.
- **PROHIBIDA en UI de producto:** la monoespaciada del sistema (`--font-mono` = `ui-monospace…`)
  **no es una fuente de marca** y se ve distinta en cada SO. No se usa en el HUD ni en ninguna
  pantalla. El token queda solo como utilidad para contenido técnico crudo (código/hashes) si
  algún día hiciera falta, y con `eslint-disable` explícito.
- **Regla mecánica:** se elige fuente por **token de rol** (`--font-display` / `--font-ui`), nunca
  por nombre de familia ni por `monospace` directo. Un lint prohíbe `--font-mono`/`monospace` en la
  UI (apps + `@osia/ui`). Las fuentes se sirven como **woff2 subset** (pipeline `@osia/assets`).

---

## 3. Internacionalización (i18n) — EN + ES desde ya

Hoy **no existe i18n** (no hay `next-intl`/`react-i18next`, no hay carpeta de locales, todos los
textos están hardcodeados, mayormente en español). Carlos pidió crear toda la configuración para
**inglés y español** y que **todos los textos** vivan en locales.

### 3.1 Decisión de librería
- **`next-intl`** para las apps Next.js (App Router) — es el estándar actual para Next 13+ App
  Router, soporta Server Components, formato ICU (plurales/fechas/números), y locale routing.
  (Investigar la versión vigente y su guía de App Router antes de cablear.)
- **Paquete compartido de mensajes**: crear **`@osia/i18n`** (o `packages/i18n`) con los catálogos
  `en` y `es` por **namespace** (p. ej. `world`, `hud`, `chat`, `voice`, `errors`, `vestibule`),
  para que `world-client` y las futuras apps (`web`, `social`, `games`) compartan locales y no se
  dupliquen. Las apps configuran `next-intl` apuntando a este paquete.

### 3.2 Reglas
- **Cero strings de UI hardcodeados.** Todo texto visible al usuario sale de un catálogo de
  mensajes con clave (`t('hud.pressToTalk')`), nunca literal en el JSX/TS.
- **Siempre las dos lenguas a la vez.** Agregar una clave implica agregarla en `en` **y** `es`. Un
  test/lint de paridad de claves debe fallar si una clave existe en un idioma y no en el otro.
- **Default `es` (es-CO), fallback/segundo idioma `en`.** El usuario puede cambiar; persistir la
  preferencia.
- **Español NEUTRO — sin acento argentino/rioplatense (sin voseo). REGLA PERMANENTE de Carlos.**
  El `es-CO` usa **tuteo neutro**, nunca voseo: «Crea» no «Creá», «Verifica» no «Verificá»,
  «Ingresa» no «Ingresá», «Revisa» no «Revisá», «Prueba» no «Probá», «eres» no «sos», «tienes» no
  «tenés», «mantén» no «mantené», «escribe» no «escribí», «espera» no «esperá». Tono sobrio,
  atemporal, sin localismos. **Aplica a TODO: el copy de producto (i18n en/es) Y la comunicación
  de Claude con Carlos** (mensajes, explicaciones). Carlos lo pidió explícito: «no quiero acentos
  argentinos en ningún lado».
- **Formato con ICU:** plurales, fechas y números vía el formateador de `next-intl` (no concatenar
  strings ni formatear a mano).
- **Separar idioma de UI vs. lenguaje de dominio.** El **glosario** ([`docs/11`](./docs/11-glosario-dominio.md)) define el lenguaje
  ubicuo es-CO para **identificadores de código y dominio** (entidades, eventos, columnas): eso
  **no** se traduce, es nombre técnico. Lo que se traduce es el **copy visible** (labels, botones,
  mensajes, errores mostrables). Los `code` de error son enums estables ([`docs/10`](./docs/10-contratos-api-eventos.md) §1.4); su
  `message` mostrable se localiza.
- **El HUD 3D también usa i18n.** Nameplates, prompts ("Hablar", "Pulsa para hablar"), toasts de
  evento ("Comienza la lluvia de meteoros") — todo desde catálogos.

### 3.3 Estructura sugerida
```
packages/i18n/
  src/
    en/  world.json · hud.json · chat.json · voice.json · errors.json · vestibule.json
    es/  world.json · hud.json · chat.json · voice.json · errors.json · vestibule.json
    index.ts        # carga/merge de namespaces, tipos de claves
  package.json      # @osia/i18n
```
> Tarea de cimiento de Sprint 1: montar `@osia/i18n` + `next-intl` en `world-client`, migrar todos
> los textos actuales a claves en `en`/`es`, y dejar el selector de idioma.

---

## 4. Convenciones (del glosario, vinculantes)

Fuente: [`docs/11-glosario-dominio.md`](./docs/11-glosario-dominio.md). Resumen operativo:

### 4.1 Lenguaje ubicuo
- **Un término, un significado, en todas partes.** Usar el glosario. Anti-glosario: NO "NPC"
  (es **Habitante**/`Inhabitant`), NO "launcher" (es **Vestíbulo**), NO "level/mapa" (es
  **Instancia/Room**). Si introduces un concepto nuevo de dominio, **agrégalo primero al glosario**.

### 4.2 Nombres en código (TypeScript)
- Entidad/clase/tipo: `PascalCase` singular (`AtmosphereState`). Variable/función: `camelCase`.
- Constante de módulo: `SCREAMING_SNAKE_CASE` (`TICK_RATE_HZ`). Enum: `PascalCase`, valores
  `SCREAMING_SNAKE` o `kebab` string.
- Componente React: `PascalCase.tsx`. Hook: `use<Cosa>`. Store Zustand: `use<Cosa>Store`.
- Archivo de clase/entidad: `PascalCase.ts`; utilitario: `kebab-case.ts`; test: `*.test.ts`/`*.spec.ts`.
- Paquetes internos: **`@osia/<paquete>`**.

### 4.3 Ramas
`<tipo>/<contexto-corto>-<descripcion-kebab>` — tipos: `feat`, `fix`, `chore`, `docs`, `refactor`,
`perf`, `spike`. Base: `main` (siempre desplegable), sin `develop`.

### 4.4 Commits (cuando Carlos pida commitear)
Conventional Commits es-CO: `<tipo>(<alcance>): <resumen imperativo, minúscula, sin punto>`.
Ej.: `feat(world-server): tick fijo a 20 Hz`. Alcances: `web`, `world-client`, `world-server`,
`api`, `identity`, `atmosphere`, `ui`, `shared`, `i18n`, `assets`, `infra`, `glosario`.

---

## 5. Contratos compartidos (`@osia/shared`)

- **Única fuente de verdad** del protocolo de red y los tipos cruzados ([`docs/10`](./docs/10-contratos-api-eventos.md)). Cliente y
  servidor importan el **mismo** tipo: si el contrato cambia, **ambos dejan de compilar a la vez**
  (atomicidad). No copiar tipos entre apps.
- **Protocolo binario**: opcode (1 byte) + payload. Calientes (`INPUT 0x02`, `DELTA 0x83`, `ACK`,
  `PING/PONG`) bit-packed/cuantizados; fríos msgpack. `protocolVersion` negociado en `HELLO/WELCOME`.
- **Codec con tests de round-trip** (encode→decode === original) para cada mensaje.
- **Validación con Zod** en los bordes (cliente para UX, servidor para seguridad), esquemas en
  `@osia/shared`. **Nunca confiar en el cliente.** Validar cada mensaje binario antes de tocar la
  simulación.
- **IDs branded** (`AccountId`, `EntityId`) para evitar mezclar identificadores.

---

## 6. Motor de atmósfera (`@osia/atmosphere`)

- **Lógica pura compartida**: sin I/O, sin Three.js, sin red, sin DB. (Ver [`docs/06`](./docs/06-motor-atmosfera.md).)
- **Color en OKLab/OKLCH** (no sRGB) para interpolar; **slerp** para direcciones sol/luna;
  **smoothstep/easing** para floats; **histéresis** para fx/audio.
- **PRNG sembrado** (mulberry32); **`Math.random` PROHIBIDO** en el motor (lo verifica el lint).
- **Eventos efímeros deterministas por seed** (`scheduleEvents`), no "tirar dados cada tick".
- **Server-authoritative**: el servidor avanza el estado y emite `ATMOSPHERE_UPDATE` solo en
  cambios; el cliente corre `resolveAtmosphere` localmente cada frame.
- **Linter de presets (CI)**: valida el gamut `house-celestial` (colores permitidos/prohibidos).
- Presets nuevos = **datos**, no código.

---

## 7. Rendimiento (presupuestos no-negociables)

Fuente: [`docs/08-estrategia-rendimiento.md`](./docs/08-estrategia-rendimiento.md). Un presupuesto roto = la feature se recorta/optimiza,
no se sube el presupuesto.

- **Presupuestos F0:** 60 fps desktop / 30 mobile; **draw calls ≤ 150** (desktop); **triángulos
  ≤ 1M**; **VRAM ≤ 1 GB**; primer frame ≤ 4 s desktop; **≤ 1.5 KB/jugador/tick** de red.
- **`disposeScene` desde el día 1** y test de fuga (entrar/salir 20× → `renderer.info.memory` al
  baseline). La GC del navegador NO libera VRAM: `.dispose()` explícito en geo/mat/tex/RT, limpiar
  listeners, timers, `RTCPeerConnection`, sockets.
- **InstancedMesh** para repetición (1 draw call por tipo). **KTX2 + mipmaps + Meshopt** obligatorio
  (PNG/JPG prohibidos en escena). **Niebla** como herramienta de rendimiento y marca.
- **Code-splitting**: el engine R3F/Three se carga on-demand; el (futuro) Vestíbulo no incluye Three.
- **Cero asignaciones en el hot path** (loop de render/sim/culling): pooling de vectores, buffers de
  red reutilizables. Las asignaciones van en setup/carga, no por frame.
- **No re-render de React por frame**: la animación/atmósfera/HUD-bus corre fuera del ciclo de React
  (useFrame, rAF, refs), no provocando renders.
- **HUD de profiling** (r3f-perf + `gl.info`) detrás de flag. Medir, no adivinar.

---

## 8. Seguridad y privacidad

Fuente: [`docs/09-seguridad-infra-costos.md`](./docs/09-seguridad-infra-costos.md).

- **Server-authoritative = anti-cheat de base.** Cliente envía inputs; el server clampa velocidad/
  teleport, valida colisión, ignora `entityId` impuesto por el cliente.
- **World ticket** JWT HS256 (~60 s, un solo uso, `jti` en Redis), verificado **por firma** sin
  tocar la DB. Ticket inválido/expirado/reusado → `ERROR` + cierre.
- **CORS allowlist** (no `*`) + validación de **`Origin`** en el upgrade WS.
- **Rate-limit** de chat/inputs/signaling (in-process en world-server; Redis para negocio).
- **Secrets solo server-side** (`WORLD_TICKET_SECRET`, etc.), nunca en bundles de cliente ni en
  logs (Pino con redacción). Toda llamada a IA pasa por `apps/api` (Fase 2+), nunca el cliente
  tiene la API key.
- **Voz P2P nunca toca el servidor ni se graba** (cero retención). Micrófono opt-in / push-to-talk.
  `Permissions-Policy: microphone=(self)`. Security headers (HSTS/CSP/nosniff/frame DENY).

---

## 9. Accesibilidad (no opcional)

- **Contraste WCAG AA** mínimo sobre ónix (ver tabla [`docs/02`](./docs/02-marca-design-system.md) §9.3); `taupe-500` es el piso.
- **`prefers-reduced-motion`** respetado (cruce de umbral degrada a fade; sin loops ambientales).
- **Foco siempre visible** (anillo champán); navegación completa por teclado; nunca `outline:none`
  sin reemplazo.
- **No depender solo del color** (estados con icono/texto). **Targets táctiles ≥ 44×44px** en mobile.
- Texto escalable (rem/em; zoom hasta 200%).

---

## 10. Calidad: tests, lint, typecheck, DoD

- Antes de declarar algo "hecho": `pnpm typecheck`, `pnpm lint`, `pnpm test` (y `pnpm build` si
  toca) **en verde**. Reportar la salida real.
- **Tests** donde aporten: codec (round-trip), atmósfera (resolución/interp/scheduling deterministas),
  movimiento (predicción/reconciliación), utilidades puras. La lógica pura compartida **debe** tener
  tests.
- **TypeScript estricto** (ya está `strict` + `noUncheckedIndexedAccess` + `noImplicitOverride` +
  `noFallthroughCasesInSwitch` en `tsconfig.base.json`): respetarlo, no relajarlo, no `// @ts-ignore`
  sin justificación.
- **ESLint**: sin warnings nuevos. Activar reglas type-aware (`no-floating-promises`) por paquete
  cuando esté listo; añadir reglas para **prohibir strings hardcodeadas** en UI y **`Math.random`**
  en `@osia/atmosphere`.
- **Definition of Done** de una historia: criterios de aceptación del backlog cumplidos +
  typecheck/lint/test verdes + i18n (sin texto hardcodeado) + sin smells + sin fuga de recursos +
  (si es UI) usa `@osia/ui` y tokens + accesibilidad básica.

---

## 11. Flujo de trabajo con Claude

1. **Entender primero**: leer los docs relevantes y el código real antes de tocar. No asumir.
2. **Investigar el estándar** (§0.3) para lo "ya resuelto".
3. **Plan** para cambios grandes; ejecutar para los chicos.
4. **Cambios mínimos y enfocados**, en el estilo del código vecino.
5. **Dejar en staged** (§0.1), reportar qué cambió, qué se probó y qué falta. **No commitear.**
6. **Verificar**: correr typecheck/lint/test; para cambios visibles, ejecutar la app si aplica.
7. **Decir la verdad** sobre el resultado.

---

## 12. Anti-alcance de Fase 0 (no sobre-construir)

Rehacer por **calidad** (SOLID, reuso, i18n) es obligatorio. Construir **features de fases futuras**
antes de tiempo, no. NO en Fase 0 (de [`docs/backlog/fase-0`](./docs/backlog/fase-0-el-sentimiento.md) y [`docs/08`](./docs/08-estrategia-rendimiento.md) §14):
- ❌ Cuentas persistentes / Supabase Auth / Vestíbulo real (Fase 1).
- ❌ Habitantes IA / Claude / Whisper / TTS (Fase 2).
- ❌ Feed/social, juegos/ranking, plots/economía (Fases 3–5).
- ❌ Geo-clipmap, streaming de chunks, virtual texturing, dynamic resolution, SFU mediasoup.
- ❌ LOD de 4 niveles con cross-fade, occlusion queries por hardware.
- ✅ SÍ desde día 1: KTX2+mipmaps+Meshopt, dispose disciplinado, HUD de profiling, niebla,
  separación engine on-demand, **`@osia/ui` reutilizable, i18n EN+ES, tests de lógica pura**.

> El equilibrio: **calidad y arquitectura correctas hoy; amplitud de producto cuando su fase llegue.**

---

## 13. Referencias de industria (investigar y seguir)

- **Netcode/MMO:** Gabriel Gambetta (client prediction/reconciliation/interpolation), Valve Source
  multiplayer networking, charlas GDC de Overwatch, Glenn Fiedler (Gaffer on Games) snapshot/delta.
- **R3F/Three.js:** docs de React Three Fiber/drei, gestión de memoria/dispose, KTX2/Basis, Meshopt.
- **WebRTC voz:** "Perfect Negotiation" (MDN), límites de mesh vs SFU, coturn/TURN, Web Audio
  PannerNode (audio espacial).
- **Color/determinismo:** OKLab/OKLCH (Björn Ottosson), PRNG mulberry32/xoshiro.
- **Frontend/arquitectura:** SOLID, atomic design / design systems, `next-intl` (i18n App Router).

---

## 14. Mapa rápido del repo

```
apps/
  world-client/   El Mundo (Next.js + React Three Fiber)   — net/ voice/ world/ ui/
  world-server/   Servidor autoritativo (Node + uWebSockets.js)
  web/ api/ social/ games/   placeholders (Fases 1/3/4)
packages/
  shared/         Contratos de red, codec, movimiento, sanitización  (@osia/shared)
  atmosphere/     Motor de atmósfera puro                            (@osia/atmosphere)
  ui/             Design System (tokens + componentes)  ← HOY stub, a construir (@osia/ui)
  i18n/           Locales EN+ES                          ← NO existe aún, a crear (@osia/i18n)
  assets/ identity/   pipeline de assets / pasaporte (placeholder)
infra/  docker-compose, Caddyfile        docs/  paquete de diseño (fuente de verdad)
```

> Comandos: `pnpm i`, `pnpm dev`, `pnpm build`, `pnpm lint`, `pnpm typecheck`, `pnpm test`,
> `pnpm dev:infra` (Redis+Postgres). Ver [`README.md`](./README.md).

---

_Mantén este archivo vivo: si una regla cambia o se añade una práctica, actualízalo aquí (en
staged, sin commitear). La coherencia es el lujo._
