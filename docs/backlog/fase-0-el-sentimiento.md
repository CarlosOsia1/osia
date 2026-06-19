# Backlog de Sprints — Fase 0 · El Sentimiento

> Propósito: definir el backlog ejecutable (sprints, historias, criterios, tareas técnicas) que lleva OSIA desde una carpeta vacía hasta la primera escena bella y jugable donde caminar con amigos, hablar por voz y sentir una atmósfera viva. | Estado: Borrador v1 | Fecha: 2026-06-19 | Parte del paquete de diseño OSIA.

Documentos relacionados: ver [./../00-vision-alcance.md](../00-vision-alcance.md), [./../01-pilares-experiencia.md](../01-pilares-experiencia.md), [./../02-marca-design-system.md](../02-marca-design-system.md), [./../03-arquitectura-sistema.md](../03-arquitectura-sistema.md), [./../04-modelo-datos-er.md](../04-modelo-datos-er.md), [./../05-realtime-mundo-networking.md](../05-realtime-mundo-networking.md), [./../06-motor-atmosfera.md](../06-motor-atmosfera.md), [./../08-estrategia-rendimiento.md](../08-estrategia-rendimiento.md), [./../09-seguridad-infra-costos.md](../09-seguridad-infra-costos.md), [./../10-contratos-api-eventos.md](../10-contratos-api-eventos.md), [./../11-glosario-dominio.md](../11-glosario-dominio.md).

---

## 1. Objetivo de la Fase

Producir **la primera escena bella jugable** de OSIA: un mundo low-poly atmosférico que se recorre **a pie**, donde 2-3 amigos se ven, se mueven sincronizados, se hablan por **voz P2P**, y donde el **Motor de Atmósfera** hace que el cielo respire (3-4 presets celestiales, transiciones suaves, ciclo día/noche y 1-2 eventos efímeros raros).

**North Star de la fase:** la frase _"uy, yo me quedo acá"_ dicha por un humano real en la primera sesión. Si esto no pega, nada más del roadmap importa (puerta de decisión no-go, ver [00-vision-alcance.md](../00-vision-alcance.md)). Esta fase NO construye cuentas persistentes, ni Vestíbulo, ni IA, ni social, ni juego: esos son Fases 1-4. Aquí solo construimos **el sentimiento**.

### Lo que SÍ entra en Fase 0
- Monorepo modular (pnpm + Turborepo) con `apps/world-client`, `apps/world-server`, `packages/shared`, `packages/atmosphere`, `packages/assets`, `packages/ui` (mínimo).
- Cliente R3F: escena, cámara tercera persona, iluminación, postprocessing (bloom, ACES, vignette, color grade), niebla.
- Avatar low-poly + controlador de movimiento a pie (Rapier kinematic) + cámara orbital de seguimiento.
- World-server uWebSockets.js autoritativo: rooms, join/leave, tick fijo 20 Hz, broadcast de posiciones, AOI mínimo.
- Sincronización de movimiento: inputs numerados → predicción cliente → reconciliación servidor; remotas interpoladas.
- Chat de texto básico in-world.
- Voz WebRTC P2P (mesh) con signaling sobre el WS existente.
- Motor de Atmósfera v1: lógica pura compartida + 4 presets + transiciones interpoladas + ciclo día/noche server-authoritative + 1-2 eventos efímeros deterministas.
- Pipeline mínimo de assets CC0 (GLTF → Meshopt, KTX2 + mipmaps) + manifiesto LOD básico.
- HUD de profiling (r3f-perf + renderer.info) y `disposeScene` desde el día 1.
- Deploy: world-client en Vercel, world-server + Redis en Hetzner (Docker).

### Lo que NO entra (anti-alcance de la fase)
- ❌ Cuentas persistentes / email verificado / Supabase Auth (Fase 1).
- ❌ El Vestíbulo / Pasaporte / SSO real (Fase 1). En F0 la identidad es **efímera**: un nombre + un ticket de mundo sin DB.
- ❌ Habitantes IA / Claude / Whisper / TTS (Fase 2).
- ❌ Feed, seguidores, notificaciones (Fase 3).
- ❌ Juegos, ranking, cosméticos comprables (Fase 4).
- ❌ Plots persistentes, multi-owner, economía (Fase 5+).
- ❌ Geo-clipmap, streaming de chunks, dynamic resolution, virtual texturing (Fase 2+). En F0 el terreno es **una malla horneada única**.
- ❌ SFU mediasoup (solo mesh P2P para grupos ≤6).

> Nota de identidad en F0: como aún no hay cuentas, el "login" es un **handle efímero** que el cliente envía al pedir un world ticket. El world-server firma/valida ese ticket con una **clave compartida HS256** (sin tocar Postgres). Esto deja el contrato `POST /world/tickets` y el handshake WS listos para que Fase 1 los reconecte al SSO real sin reescribir el world-server.

---

## 2. Definition of Done de la FASE

La Fase 0 está terminada cuando **todo** lo siguiente es verdad y demostrable en producción (no en local):

| # | Criterio de cierre | Verificación |
|---|---|---|
| F0-DoD-1 | Dos personas en máquinas distintas, vía URL pública, entran a la **misma instancia** y se ven moverse en tiempo real. | Sesión grabada con 2 navegadores reales. |
| F0-DoD-2 | El movimiento se siente **suave** (predicción + reconciliación, sin rubber-banding perceptible a ~80-120 ms RTT). | Prueba con latencia inyectada (`tc`/throttle). |
| F0-DoD-3 | Las dos personas se **escuchan por voz** (WebRTC P2P), el audio nunca toca el servidor. | Captura de `chrome://webrtc-internals` mostrando conexión P2P. |
| F0-DoD-4 | El **chat de texto** funciona y se ve en pantalla con estética OSIA. | Demo. |
| F0-DoD-5 | El cielo **transiciona** entre 4 atmósferas brutales sin snaps; ambos clientes ven el **mismo** momento atmosférico. | Comparación lado a lado de 2 pantallas en el mismo `worldClock`. |
| F0-DoD-6 | Ocurre al menos **1 evento efímero** (p. ej. lluvia de meteoros) de forma determinista y visible para todos los presentes. | Demo con `seed` reproducible. |
| F0-DoD-7 | La escena cumple presupuestos F0: **60 fps desktop**, draw calls ≤ 150, VRAM ≤ 1 GB, primer frame ≤ 4 s desktop. | HUD de profiling + performance budget check. |
| F0-DoD-8 | Entrar/salir de la zona 20 veces deja `renderer.info.memory` en el baseline (sin fuga de VRAM). | Test de dispose. |
| F0-DoD-9 | Está desplegado: world-client en Vercel, world-server + Redis en Hetzner (Docker, restart policy), accesible por dominio. | URL pública viva. |
| F0-DoD-10 | El **veredicto humano**: al menos 2 de 3 amigos dicen, sin que se les pida, alguna variante de _"me quiero quedar acá"_. | Registro cualitativo de la sesión piloto. |

> **Puerta no-go:** si F0-DoD-10 falla tras iterar el mood/atmósfera (ADR-000), se detiene el roadmap y se reevalúa el concepto. El resto del software ya estará construido y reutilizable.

### Entregable demostrable
Un **link público** que dos amigos abren, eligen un nombre, cruzan un fade de marca, aparecen en una plaza low-poly al atardecer champán, caminan juntos, se oyen, ven caer una lluvia de meteoros y el atardecer volverse noche estrellada — y no quieren irse.

---

## 3. Mapa de Sprints

Dimensionado para **un dev solo** con foco fragmentado (~1-2 semanas por sprint, ~20-25 h reales por semana). Orden por dependencias técnicas y por entregar "algo que se ve" lo antes posible.

| Sprint | Título | Duración | Depende de | Resultado visible |
|---|---|---|---|---|
| **OSIA-S0.1** | Cimientos del Monorepo y CI | 1 sem | — | `pnpm i && turbo build` verde; CI en GitHub. |
| **OSIA-S0.2** | Primera Luz: escena R3F bella estática | 1.5 sem | S0.1 | Una escena low-poly con postFX y niebla, navegable solo. |
| **OSIA-S0.3** | El Cuerpo: avatar + locomoción a pie | 1.5 sem | S0.2 | Caminás un avatar low-poly por la escena con cámara de seguimiento. |
| **OSIA-S0.4** | El Latido: world-server uWS + tick + rooms | 2 sem | S0.1 | Server autoritativo corre, acepta WS, simula a 20 Hz. |
| **OSIA-S0.5** | Estar Juntos: sincronización de presencia | 2 sem | S0.3, S0.4 | Dos clientes se ven moverse suave (predicción/reconciliación/interpolación). |
| **OSIA-S0.6** | Hablar: chat de texto + voz WebRTC P2P | 1.5 sem | S0.5 | Chat in-world + voz mesh entre 2-3 personas. |
| **OSIA-S0.7** | El Cielo Vivo: Motor de Atmósfera v1 | 2 sem | S0.2, S0.4 | 4 presets, transiciones, ciclo día/noche, 1-2 eventos efímeros, sincronizado. |
| **OSIA-S0.8** | Pulido, Rendimiento y Lanzamiento | 1.5 sem | todos | Deploy público, presupuestos cumplidos, sesión piloto. |

Total estimado: **~12.5 semanas** (un dev solo, con holgura para empleo/imprevistos). Los sprints S0.4 y S0.7 pueden solaparse parcialmente si el momentum lo permite, pero S0.5 bloquea a ambos en su integración.

---

## OSIA-S0.1 · Cimientos del Monorepo y CI

- **Objetivo:** scaffolding del monorepo modular que toda la fase (y el ecosistema) usará: pnpm workspaces + Turborepo, TS base, lint/format, paquetes vacíos pero conectados, `docker-compose` de dev (Redis + Postgres), CI básica. Sin esto, todo lo demás es deuda.
- **Duración:** 1 semana.
- **Dependencias:** ninguna (primer sprint).
- **Riesgos:** sobre-ingeniería temprana (gastar la semana en tooling perfecto en vez de avanzar). Mitigación: timebox; configs mínimas que funcionen, no exhaustivas.

### OSIA-S0.1-H1 — Scaffold del monorepo
**Como** Dev/Operador **quiero** un monorepo pnpm + Turborepo con la estructura bloqueada **para** desarrollar/desplegar cada app y paquete por separado desde el día 1.

**Criterios de aceptación:**
- Dado el repo raíz `d:/Workspace/OSIA`, cuando ejecuto `pnpm install`, entonces resuelve el workspace sin errores.
- Dado el workspace, cuando ejecuto `pnpm turbo build`, entonces corre tareas en todas las apps/packages (aunque sean stubs) y cachea.
- Existen los directorios: `apps/world-client`, `apps/world-server`, `packages/shared`, `packages/atmosphere`, `packages/assets`, `packages/ui`, `infra`. `apps/web`, `apps/api`, `apps/social`, `apps/games`, `packages/identity` quedan como placeholders documentados (se llenan en fases posteriores).
- `tsconfig.base.json` en la raíz; cada paquete extiende de él.
- `.env.example` documenta todas las variables previstas de F0.

**Tareas técnicas:**
- [ ] `pnpm-workspace.yaml` con `apps/*` y `packages/*`.
- [ ] `turbo.json` con pipeline `build`, `dev`, `lint`, `typecheck`, `test`; `dependsOn: ["^build"]`, cache de outputs.
- [ ] `tsconfig.base.json` (target ES2022, `strict: true`, `moduleResolution: bundler`, paths `@osia/*`).
- [ ] `package.json` raíz con scripts `dev/build/lint/typecheck` delegando a turbo; pin de versión de pnpm en `packageManager`.
- [ ] Stubs de `package.json` + `src/index.ts` para `@osia/shared`, `@osia/atmosphere`, `@osia/assets`, `@osia/ui`.
- [ ] `.gitignore`, `.nvmrc`/`.node-version` (Node 20 LTS), `.editorconfig`.
- [ ] `.env.example` con: `WORLD_TICKET_SECRET`, `WORLD_SERVER_PORT`, `REDIS_URL`, `NEXT_PUBLIC_WORLD_WS_URL`, `NEXT_PUBLIC_WORLD_API_URL`, `WORLD_CORS_ORIGINS`.

**Definition of Done:** `pnpm i && pnpm turbo build` verde localmente; estructura commiteada en `main`.

### OSIA-S0.1-H2 — Lint, formato y typecheck unificados
**Como** Dev/Operador **quiero** ESLint + Prettier + typecheck compartidos **para** mantener consistencia (principio de lujo: consistencia) sin pelear configs por paquete.

**Criterios de aceptación:**
- `pnpm lint` y `pnpm typecheck` corren en todo el workspace y pasan.
- Formato consistente al guardar (config compartida).
- Convenciones del glosario respetadas en lint donde sea automatizable (ver [11-glosario-dominio.md](../11-glosario-dominio.md)): nombres de paquetes `@osia/<pkg>`.

**Tareas técnicas:**
- [ ] ESLint flat config en la raíz (TS, import order, no-floating-promises).
- [ ] Prettier config + `.prettierignore`.
- [ ] Script `typecheck` por paquete (`tsc --noEmit`) orquestado por turbo.
- [ ] Husky + lint-staged opcional (timebox; si come tiempo, se omite en F0).

**DoD:** lint/typecheck verdes; documentado en README raíz cómo correrlos.

### OSIA-S0.1-H3 — Entorno de desarrollo local (Redis + Postgres)
**Como** Dev/Operador **quiero** un `docker-compose` de dev con Redis y Postgres **para** reproducir presencia/pubsub y (futuro) DB sin instalar servicios a mano.

**Criterios de aceptación:**
- `docker compose -f infra/docker-compose.dev.yml up` levanta Redis y Postgres con puertos y credenciales del `.env.example`.
- Redis responde a `PING`. (Postgres se levanta para Fase 1; en F0 solo se valida que arranca.)

**Tareas técnicas:**
- [ ] `infra/docker-compose.dev.yml` (redis:7-alpine, postgres:16-alpine, volúmenes nombrados).
- [ ] Script `pnpm dev:infra` que envuelve el compose.
- [ ] Healthcheck básico en los servicios.

**DoD:** infra de dev levanta y Redis es alcanzable desde Node.

### OSIA-S0.1-H4 — CI básica en GitHub Actions
**Como** Dev/Operador **quiero** CI que valide install/lint/typecheck/build en cada push **para** no romper `main` trabajando solo y fragmentado.

**Criterios de aceptación:**
- Push/PR dispara workflow que: instala pnpm, restaura cache de Turbo, corre `lint`, `typecheck`, `build`.
- El workflow falla si algo falla; verde si todo pasa.

**Tareas técnicas:**
- [ ] `.github/workflows/ci.yml` con `actions/setup-node`, `pnpm/action-setup`, cache de pnpm store y de Turbo.
- [ ] Matriz mínima (Node 20).
- [ ] Convención de ramas `<tipo>/<contexto>-<desc>` y commits Conventional es-CO documentada (ver [11-glosario-dominio.md](../11-glosario-dominio.md)).

**DoD:** badge verde en `main`; un PR de prueba pasa CI.

---

## OSIA-S0.2 · Primera Luz: escena R3F bella estática

- **Objetivo:** que exista una **escena que da ganas de mirar** — low-poly + atmósfera (postFX, niebla, HDRI, ciclo de luz estático) — navegable en solitario. Este es el primer momento "wow" técnico y la base de render para todo lo demás. Aquí se cablea el HUD de profiling y el `disposeScene` ANTES de optimizar nada (ver [08-estrategia-rendimiento.md](../08-estrategia-rendimiento.md)).
- **Duración:** 1.5 semanas.
- **Dependencias:** S0.1.
- **Notas de rendimiento:** terreno = **una malla horneada única** (no clipmap, no streaming). KTX2 + mipmaps + Meshopt obligatorios desde ya. Code splitting: el engine R3F/Three se carga on-demand (el futuro Vestíbulo no debe incluir Three.js).

### OSIA-S0.2-H1 — Bootstrap del cliente Next.js + R3F
**Como** Visitante **quiero** abrir una URL y ver una escena 3D renderizada **para** entrar al mundo de OSIA desde el navegador.

**Criterios de aceptación:**
- `apps/world-client` es un Next.js (App Router, TS) que monta un `<Canvas>` de R3F.
- El engine 3D se carga vía `import()` dinámico (code splitting); la ruta de entrada NO incluye Three.js en su bundle inicial.
- Render a 60 fps con una escena base (suelo + skybox) en desktop.

**Tareas técnicas:**
- [ ] `apps/world-client` con Next.js App Router + TypeScript.
- [ ] Dependencias: `three`, `@react-three/fiber`, `@react-three/drei`, `@react-three/rapier`, `@react-three/postprocessing`, `zustand`.
- [ ] Componente `WorldCanvas` cargado con `next/dynamic` (`ssr: false`).
- [ ] Loop de render con `frameloop` adecuado; tone mapping ACES en el renderer.
- [ ] Zustand store cliente para estado de escena (cámara, calidad, debug).

**DoD:** `pnpm dev` muestra una escena 3D navegable; bundle de entrada sin Three.js verificado.

### OSIA-S0.2-H2 — HUD de profiling y disciplina de dispose (PRIMERO)
**Como** Dev/Operador **quiero** ver fps, draw calls, triángulos y VRAM en pantalla **para** no optimizar a ciegas y atrapar fugas de VRAM (bug #1 en sesiones largas).

**Criterios de aceptación:**
- Un atajo/flag muestra un overlay con: fps, `renderer.info.render.calls`, `.triangles`, `memory.geometries`, `memory.textures`, render scale, tier activo.
- `disposeScene(scene)` libera geometrías/materiales/texturas; existe test manual: entrar/salir de la zona 20 veces deja `renderer.info.memory` en baseline.

**Tareas técnicas:**
- [ ] Integrar `r3f-perf` + panel propio leyendo `gl.info`.
- [ ] `disposeScene(scene)` que recorre y llama `.dispose()` en geo/mat/tex y libera del pool.
- [ ] FeatureFlag local (query param o tecla) para mostrar/ocultar HUD.
- [ ] Test de fuga documentado en README del world-client.

**DoD:** HUD visible bajo flag; test de dispose pasa (memoria vuelve al baseline ±tolerancia).

### OSIA-S0.2-H3 — Pipeline mínimo de assets CC0
**Como** Dev/Operador **quiero** un pipeline `packages/assets` que convierta GLTF a Meshopt y texturas a KTX2+mipmaps **para** que la escena se vea cara y cargue rápido (cambiar formatos después duele).

**Criterios de aceptación:**
- Modelos CC0 (Quaternius/Kenney/Poly Pizza) pasan por `gltf-transform` (Meshopt) y texturas por `toktx` (KTX2 con mipmaps).
- PNG/JPG **prohibidos** en escena; todo textura es KTX2 transcodeado por device (`KTX2Loader`).
- Existe un `manifest` JSON con clases de asset y (placeholder) distancias de LOD declaradas por clase.

**Tareas técnicas:**
- [ ] `packages/assets` con script `build:assets` (gltf-transform meshopt/dedup/prune; toktx KTX2 BC7/ASTC/ETC2 + mipmaps).
- [ ] `KTX2Loader` + `MeshoptDecoder` configurados en el world-client.
- [ ] `asset-manifest.json` por clase (árbol, roca, edificio, suelo) con campos `lod[]` y `cdnBaseUrl` (placeholder Cloudflare R2).
- [ ] Documentar licencias CC0 y SIL OFL en `packages/assets/LICENSES.md`.

**DoD:** al menos 3 assets CC0 cargados como KTX2/Meshopt en la escena; manifiesto commiteado; sin PNG/JPG en runtime.

### OSIA-S0.2-H4 — Escena base: terreno, props instanciados, HDRI, niebla, postFX
**Como** Visitante **quiero** ver una plaza low-poly atmosférica con luz, niebla y bloom **para** sentir de inmediato que esto es "de lujo".

**Criterios de aceptación:**
- Una plaza low-poly: suelo horneado único + props (árboles/rocas) vía `InstancedMesh` (1 draw call por tipo).
- HDRI de Poly Haven como `environment`; niebla `FogExp2` cuyo color luego dictará el motor de atmósfera.
- PostFX: bloom, tone mapping ACES, vignette, color grading; todo dentro de paleta de marca (champán/ónix/marfil/taupe).
- Presupuestos F0 respetados: draw calls ≤ 150, triángulos ≤ 1M, VRAM ≤ 1 GB.

**Tareas técnicas:**
- [ ] Terreno como malla única horneada (sin clipmap).
- [ ] `InstancedMesh` para árboles/rocas/props repetidos; frustum culling activo.
- [ ] `Environment` (HDRI KTX2/EXR) + luz direccional (sol) + hemisférica.
- [ ] `EffectComposer`: Bloom + ToneMapping (ACES) + Vignette + (LUT/color grade champán-ónix).
- [ ] `FogExp2` con color expuesto como variable para el motor de atmósfera.
- [ ] Verificar presupuestos en el HUD.

**DoD:** screenshot que "se ve caro"; presupuestos verificados en HUD; revisión cualitativa propia "esto da ganas de mirar".

---

## OSIA-S0.3 · El Cuerpo: avatar + locomoción a pie

- **Objetivo:** poder **caminar** un avatar low-poly propio por la escena, con física kinematic (Rapier) y cámara de seguimiento. El recorrido es **a pie** (núcleo social plaza; decisión ADR-000 #2). El input se modela desde ya como **inputs numerados** para encajar luego con predicción/reconciliación.
- **Duración:** 1.5 semanas.
- **Dependencias:** S0.2.
- **Notas:** decisión ADR-000 #3 = avatares low-poly propios estilizados (atajo posible: Ready Player Me). En F0 basta 1 avatar base con animaciones idle/walk.

### OSIA-S0.3-H1 — Controlador de movimiento a pie (Rapier kinematic)
**Como** Visitante **quiero** mover mi avatar con WASD/joystick **para** recorrer el mundo a pie.

**Criterios de aceptación:**
- Movimiento sobre el plano (x,z) con `yaw`; colisión con el suelo y obstáculos vía Rapier (character controller kinematic / capsule).
- El input se captura como **comando numerado** `{seq, dtMs, move{x,z}, yaw, buttons}` (mismo layout que `INPUT 0x02` del contrato de red, ver [05-realtime-mundo-networking.md](../05-realtime-mundo-networking.md)).
- La función de movimiento vive en `packages/shared` (constantes de velocidad/aceleración) para ser **idéntica** cliente↔servidor.

**Tareas técnicas:**
- [ ] `@react-three/rapier` con character controller (capsule) kinematic.
- [ ] Constantes de movimiento en `packages/shared` (velocidad caminar, aceleración, gravedad).
- [ ] Función pura `applyMovement(state, input, constants) -> state` reutilizable en cliente y (futuro) server.
- [ ] Captura de input con `seq` incremental y `dtMs` por frame; buffer de inputs no confirmados.
- [ ] Soporte teclado + touch básico (mobile).

**DoD:** el avatar camina con colisión; `applyMovement` exportada desde shared y usada por el cliente.

### OSIA-S0.3-H2 — Avatar low-poly + animaciones idle/walk
**Como** Visitante **quiero** un avatar estilizado que se anima al caminar **para** sentir un cuerpo presente y coherente con la marca.

**Criterios de aceptación:**
- Avatar low-poly (CC0 o propio) con animaciones idle/walk vía Meshopt (soporta avatares animados).
- Blend idle↔walk según velocidad; orientación hacia la dirección de movimiento.
- Encaja en la paleta de marca (low-poly + atmósfera, no fotorrealista).

**Tareas técnicas:**
- [ ] Modelo avatar GLTF + animaciones; comprimir con Meshopt (no Draco para animados).
- [ ] `useAnimations` (drei) con cross-fade idle/walk.
- [ ] Mixamo/CC0 rig o RPM como atajo (decisión ADR-000 #3, documentar cuál se eligió).
- [ ] Pooling del avatar para reusar en avatares remotos (S0.5).

**DoD:** avatar animado camina y queda quieto; transición de animación suave.

### OSIA-S0.3-H3 — Cámara de seguimiento (tercera persona)
**Como** Visitante **quiero** una cámara que sigue mi avatar y puedo orbitar **para** ver el mundo y a mis amigos cómodamente.

**Criterios de aceptación:**
- Cámara tercera persona con damping; órbita con mouse/touch; sin clipping severo a través del terreno.
- Movimiento de cámara suave (curva de motion canónica, sin bounce; ver [02-marca-design-system.md](../02-marca-design-system.md)).

**Tareas técnicas:**
- [ ] Cámara follow con `lerp`/damping de posición y target.
- [ ] Control de órbita (yaw/pitch limitado) y zoom acotado.
- [ ] Anti-clipping básico (raycast cámara→avatar, acercar si hay obstáculo).
- [ ] Respetar `prefers-reduced-motion`.

**DoD:** recorrido cómodo de la plaza; cámara estable y suave.

### OSIA-S0.3-H4 — Nameplate y HUD diegético mínimo
**Como** Visitante **quiero** un HUD minimalista que respeta el centro de la pantalla **para** que la atmósfera mande y la info aparezca bajo demanda.

**Criterios de aceptación:**
- Nameplate sobre el avatar (placeholder del propio en F0); HUD minimalista que "respira el cielo" vía contrato `--atmo-tint`/`--atmo-glow` (se conecta de verdad en S0.7).
- Centro de pantalla "sagrado"; sin overlays invasivos.

**Tareas técnicas:**
- [ ] Componentes HUD en `packages/ui` (mínimo): `Nameplate`, contenedor HUD que lee CSS vars de atmósfera.
- [ ] Tokens base de `packages/ui` (color/espaciado/tipografía Italiana+Jost subset woff2).
- [ ] Reticle/InteractionPrompt como placeholders.

**DoD:** nameplate visible y legible sobre ónix; tokens de marca cableados.

---

## OSIA-S0.4 · El Latido: world-server uWS + tick + rooms

- **Objetivo:** el **servidor autoritativo propio** sobre uWebSockets.js: acepta conexiones WS, valida un world ticket por firma (sin DB), maneja rooms/instancias, corre un loop de **tick fijo a 20 Hz** y difunde estado. Es el corazón de tiempo real (decisión bloqueada: NO Colyseus/Construct3, desde cero).
- **Duración:** 2 semanas.
- **Dependencias:** S0.1 (monorepo, Redis, shared).
- **Notas de seguridad:** anti-cheat gratis por server-authoritative; el cliente envía **solo inputs**, nunca posiciones. Validación de cada mensaje binario antes de tocar la simulación (zod en frío, validación manual en caliente). CORS allowlist + validación de `Origin` en el upgrade WS.

### OSIA-S0.4-H1 — Contrato de red binario en packages/shared
**Como** Dev/Operador **quiero** el catálogo de opcodes + codec definido en un solo lugar **para** que cliente y servidor nunca diverjan (bump atómico).

**Criterios de aceptación:**
- `packages/shared` exporta `net/opcodes.ts` (C2S/S2C con los opcodes del doc 05/10), `net/messages.ts`, `net/entities.ts`, `net/codec.ts`.
- Mensajes calientes (`INPUT 0x02`, `DELTA 0x83`, `ACK`, `PING/PONG`) bit-packed/cuantizados; fríos en msgpack.
- `protocolVersion` negociado en `HELLO/WELCOME`.

**Tareas técnicas:**
- [ ] Definir opcodes C2S: `HELLO 0x01, INPUT 0x02, ACK 0x03, PING 0x04, CHAT_SEND 0x05, PORTAL_ENTER 0x06, INTERACT 0x07, VOICE_SIGNAL 0x08, BYE 0x09` (en F0 se implementan HELLO, INPUT, ACK, PING, CHAT_SEND, VOICE_SIGNAL, BYE).
- [ ] Opcodes S2C: `WELCOME 0x81, SNAPSHOT 0x82, DELTA 0x83, ENTITY_JOIN 0x84, ENTITY_LEAVE 0x85, PONG 0x86, CHAT_MSG 0x87, ATMOSPHERE_UPDATE 0x88, ATMOSPHERE_EVENT 0x89, VOICE_SIGNAL 0x8B, PRESENCE 0x8C, ERROR 0x8E`.
- [ ] `codec.ts`: encode/decode con cuantización (yaw float16, posiciones cuantizadas), bitmask de delta.
- [ ] Constantes de movimiento y tick compartidas; `protocolVersion`.
- [ ] Documentar en `packages/shared` (espejo de [05-realtime-mundo-networking.md](../05-realtime-mundo-networking.md) y [10-contratos-api-eventos.md](../10-contratos-api-eventos.md)).

**DoD:** codec con tests de round-trip (encode→decode === original) para cada mensaje de F0.

### OSIA-S0.4-H2 — Servidor uWebSockets.js + handshake con world ticket
**Como** Visitante **quiero** conectarme al mundo con un ticket firmado **para** entrar de forma segura sin que el server consulte la DB en el camino caliente.

**Criterios de aceptación:**
- `apps/world-server` (Node + TS) levanta uWebSockets.js, acepta upgrade WSS.
- En F0, un endpoint mínimo `POST /world/tickets {worldId, handle}` (en el propio world-server o un stub Express/uWS) emite un **world ticket** JWT HS256 (~60s, un solo uso) con `accountId` efímero (derivado del handle) e `instanceId`.
- El `HELLO` trae el ticket; el server valida **firma localmente** (jose HS256 con `WORLD_TICKET_SECRET`), sin tocar Postgres. Ticket inválido/expirado/reusado → `ERROR 0x8E` y cierre.
- Validación de `Origin` (allowlist) en el upgrade.

**Tareas técnicas:**
- [ ] `apps/world-server` con uWebSockets.js; Dockerfile.
- [ ] Emisión de world ticket (HS256, jti para un-solo-uso en Redis con TTL).
- [ ] Verificación de ticket en `HELLO` (`jose`, sin SDK de Supabase).
- [ ] Validación de `Origin` y CORS allowlist desde `WORLD_CORS_ORIGINS`.
- [ ] Logs con Pino.

**DoD:** un cliente con ticket válido completa `HELLO→WELCOME`; ticket inválido se rechaza con `ERROR`.

### OSIA-S0.4-H3 — Rooms/instancias y join/leave
**Como** Invitado **quiero** caer en una instancia (Hub) con mis amigos **para** compartir el mismo espacio.

**Criterios de aceptación:**
- Modelo de rooms: `hub` (capacidad 8-12, techo 12) en F0. `zone`/`plot` quedan tipados pero no se usan.
- Join inserta la entidad y emite `ENTITY_JOIN` a los demás + `SNAPSHOT` al que entra; leave emite `ENTITY_LEAVE`.
- Estado de la instancia vive en memoria del proceso; Redis para presencia efímera.

**Tareas técnicas:**
- [ ] `InstanceKind` (HUB/ZONE/PLOT) como enum en `packages/shared`.
- [ ] Estructura `Instance` con set de entidades, capacidad, tick state.
- [ ] Handlers join/leave; broadcast `ENTITY_JOIN`/`ENTITY_LEAVE`/`SNAPSHOT`.
- [ ] Clave Redis `presence:{accountId}` con TTL; (Pub/Sub se cablea cuando haya multi-proceso, Fase 5).

**DoD:** dos conexiones al mismo `worldId` caen en la misma instancia y se anuncian mutuamente.

### OSIA-S0.4-H4 — Loop de tick fijo 20 Hz autoritativo
**Como** Sistema **quiero** un loop de simulación a paso fijo **para** ser autoritativo, determinista y medible.

**Criterios de aceptación:**
- Tick fijo a 20 Hz (50 ms) con acumulador y catch-up limitado; send rate adaptativo a 10 Hz bajo presión.
- Cada tick: drena inputs → aplica `applyMovement` (la **misma** función de shared) → avanza atmósfera (placeholder hasta S0.7) → arma deltas → difunde.
- Métricas por tick (duración, jugadores, bytes) expuestas (Pino/contador).

**Tareas técnicas:**
- [ ] Loop con acumulador de tiempo, `MAX_CATCHUP_TICKS`.
- [ ] Cola de inputs por entidad; aplicar con clamp de velocidad/teleport (anti-cheat).
- [ ] Paso de simulación: posición server-authoritative.
- [ ] Métricas: `tickDurationMs`, `playersInTick`, `bytesOut`.
- [ ] (Opcional F0) física server-side kinematic con Rapier WASM compartido para validar colisión; si cuesta, clamp simple.

**DoD:** loop corre estable a 20 Hz con N entidades simuladas; métricas visibles en logs.

---

## OSIA-S0.5 · Estar Juntos: sincronización de presencia

- **Objetivo:** el momento social central: **dos personas se ven moverse suave**. Inputs numerados → predicción cliente → reconciliación con replay; entidades remotas interpoladas con render-delay; AOI mínimo; snapshot al join + delta por tick. Es el sprint donde "caminar con amigos" se vuelve real.
- **Duración:** 2 semanas.
- **Dependencias:** S0.3 (locomoción cliente), S0.4 (server + tick + contrato).
- **Notas de rendimiento:** AOI 40 m sobre grid 10 m con histéresis; presupuesto ≤ 1.5 KB/jugador/tick; delta con bitmask + cuantización. Medir bytes/tick reales vs presupuesto.

### OSIA-S0.5-H1 — Cliente envía inputs, recibe snapshots/deltas
**Como** Invitado **quiero** que mi movimiento se reporte al servidor como inputs **para** que el mundo sea consistente y justo (autoritativo).

**Criterios de aceptación:**
- El cliente envía `INPUT` numerado cada tick (nunca posiciones); recibe `SNAPSHOT` al entrar y `DELTA` por tick.
- El servidor responde con `ACK(lastSeq)` para que el cliente descarte inputs confirmados.

**Tareas técnicas:**
- [ ] Envío de `INPUT` con `seq/dtMs/move/yaw/buttons` a través del codec.
- [ ] Recepción y aplicación de `SNAPSHOT` (estado completo) y `DELTA` (bitmask).
- [ ] Manejo de `ACK` y poda del buffer de inputs.
- [ ] Reusar pool de avatares para entidades remotas (`ENTITY_JOIN`→spawn, `ENTITY_LEAVE`→pool).

**DoD:** el cliente reporta inputs y renderiza entidades remotas a partir de deltas.

### OSIA-S0.5-H2 — Predicción y reconciliación del jugador local
**Como** Invitado **quiero** que mi avatar responda al instante y no "rebote" **para** que caminar se sienta inmediato y suave.

**Criterios de aceptación:**
- Dado RTT ~80-120 ms, cuando muevo mi avatar, entonces responde sin lag perceptible (predicción local).
- Cuando llega el estado autoritativo, entonces se reconcilia con **replay** de inputs no confirmados, sin saltos visibles (rubber-banding imperceptible).

**Tareas técnicas:**
- [ ] Predicción: aplicar `applyMovement` localmente al emitir input.
- [ ] Al recibir estado autoritativo + `lastProcessedSeq`, re-simular inputs posteriores.
- [ ] Corrección suave (snap si el error es grande, lerp si es pequeño).
- [ ] Prueba con latencia inyectada (throttle/`tc`).

**DoD:** con latencia simulada el movimiento local se siente inmediato y la corrección es invisible/suave.

### OSIA-S0.5-H3 — Interpolación de entidades remotas
**Como** Invitado **quiero** ver a mis amigos moverse fluido **para** que la presencia se sienta viva, no a tirones.

**Criterios de aceptación:**
- Las entidades remotas se renderizan con **render-delay ~100 ms** interpolando entre snapshots/deltas.
- Animación walk/idle de remotas según velocidad inferida.

**Tareas técnicas:**
- [ ] Buffer de estados por entidad remota; interpolación temporal con delay.
- [ ] Extrapolación corta opcional ante pérdida de paquete.
- [ ] Conectar velocidad inferida al blend de animación del avatar remoto.

**DoD:** dos clientes muestran al otro moviéndose fluido sin jitter.

### OSIA-S0.5-H4 — AOI (interest management) y presupuesto de red
**Como** Sistema **quiero** sincronizar solo entidades cercanas **para** respetar el presupuesto de red y escalar.

**Criterios de aceptación:**
- AOI 40 m sobre grid uniforme 10 m con histéresis; solo se envían deltas de entidades relevantes.
- Medición real de bytes/jugador/tick ≤ 1.5 KB.

**Tareas técnicas:**
- [ ] Grid espacial 10 m + consulta de vecinos con histéresis (entra a 40 m, sale a ~45 m).
- [ ] Priorización por relevancia (distancia/movimiento).
- [ ] Instrumentar `bytesOut/playerTick` y compararlo con presupuesto en logs/HUD.

**DoD:** AOI funcionando; bytes/tick medidos y dentro de presupuesto con 3 entidades.

### OSIA-S0.5-H5 — Reconexión con gracia y heartbeat
**Como** Invitado **quiero** que un microcorte de red no me expulse del mundo **para** no perder la sesión (especialmente en móvil).

**Criterios de aceptación:**
- Heartbeat ping/pong 5 s, timeout 15 s; `RECONNECT_GRACE` 30 s con resume token y backoff exponencial.
- Al reconectar dentro de la gracia, se reanuda la misma entidad/instancia con un `SNAPSHOT` fresco.

**Tareas técnicas:**
- [ ] `PING/PONG` y sincronización de reloj (base para worldClock de atmósfera).
- [ ] Resume token de corta vida; ventana de gracia en el server antes de `ENTITY_LEAVE`.
- [ ] Backoff exponencial en el cliente; prueba de corte de red móvil.

**DoD:** corte de ~10 s reconecta sin re-login y sin perder presencia.

---

## OSIA-S0.6 · Hablar: chat de texto + voz WebRTC P2P

- **Objetivo:** que la gente **se comunique**: chat de texto in-world con estética OSIA y **voz WebRTC mesh P2P** (audio nunca toca el servidor, costo ~0; decisión bloqueada). El signaling reusa el WS existente.
- **Duración:** 1.5 semanas.
- **Dependencias:** S0.5 (canal WS estable, presencia).
- **Notas de seguridad/privacidad:** voz humana P2P **nunca se graba** (cero retención). Push-to-talk opt-in. Rate-limit de chat in-process en el world-server. `Permissions-Policy: microphone=self`.

### OSIA-S0.6-H1 — Chat de texto in-world
**Como** Invitado **quiero** escribir mensajes que mis amigos ven **para** comunicarme aunque no use voz.

**Criterios de aceptación:**
- `CHAT_SEND` (C2S) → el server difunde `CHAT_MSG` (S2C) a la instancia; aparece en un panel HUD con estética OSIA (Jost, ónix translúcido).
- Rate-limit in-process por conexión; sanitización básica del texto (longitud, trim).

**Tareas técnicas:**
- [ ] Handlers `CHAT_SEND`/`CHAT_MSG` en server con límite de longitud y rate-limit in-process.
- [ ] Panel de chat in-world en `packages/ui` (auto-fade, no roba el centro de pantalla).
- [ ] Burbujas/nameplate opcionales sobre el avatar emisor.

**DoD:** dos clientes intercambian mensajes de texto visibles y con estilo de marca.

### OSIA-S0.6-H2 — Signaling WebRTC sobre el WS
**Como** Sistema **quiero** intercambiar SDP/ICE por el canal WS existente **para** establecer voz P2P sin infraestructura extra.

**Criterios de aceptación:**
- `VOICE_SIGNAL` (C2S/S2C) transporta offers/answers/ICE entre pares de la misma instancia.
- Abstracción `VoiceTransport` (mesh ahora; deja hueco para SFU futuro).

**Tareas técnicas:**
- [ ] Relé `VOICE_SIGNAL` en el server (solo enruta, no inspecciona audio).
- [ ] `VoiceTransport` (interfaz) + implementación mesh en el cliente.
- [ ] Negociación por par para todos los presentes (malla).

**DoD:** los clientes intercambian SDP/ICE correctamente y se forma la malla de señalización.

### OSIA-S0.6-H3 — Voz mesh P2P con STUN/TURN fallback
**Como** Invitado **quiero** hablar y escuchar a mis amigos en el mundo **para** que la experiencia sea social de verdad.

**Criterios de aceptación:**
- Dado 2-3 invitados en la instancia, cuando activo push-to-talk, entonces me escuchan por audio P2P; el audio NO pasa por el servidor.
- STUN gratis para NAT común; coturn (TURN) self-host como fallback para NAT simétrico.
- Audio espacial básico opcional (volumen por distancia).

**Tareas técnicas:**
- [ ] `RTCPeerConnection` por par; tracks de audio bidireccionales.
- [ ] Push-to-talk (tecla/botón), opt-in de micrófono, indicador de "hablando" (VoiceHalo).
- [ ] STUN público + desplegar **coturn** en Hetzner; banco de pruebas de NAT.
- [ ] (Opcional) `PannerNode` para volumen por distancia.
- [ ] Verificación en `chrome://webrtc-internals` de conexión P2P (no relay salvo TURN).

**DoD:** 2-3 personas se escuchan por voz P2P; coturn cubre el caso de NAT difícil; cero audio en el servidor.

---

## OSIA-S0.7 · El Cielo Vivo: Motor de Atmósfera v1

- **Objetivo:** el **pilar #1** — la atmósfera que hace que el low-poly se sienta caro. `packages/atmosphere` (lógica pura), 4 presets brutales, transiciones suaves interpoladas, ciclo día/noche **server-authoritative y compartido**, y 1-2 **eventos efímeros raros deterministas**. Ambos clientes ven el mismo atardecer.
- **Duración:** 2 semanas.
- **Dependencias:** S0.2 (render/postFX/niebla), S0.4 (tick + broadcast + worldClock).
- **Notas:** color en OKLab/OKLCH (no sRGB), slerp para direcciones de sol/luna, smoothstep para floats; PRNG sembrado (mulberry32/xoshiro), **prohibido `Math.random`** en el motor. Linter de presets en CI (gamut house-celestial). Mood por defecto: blend crepúsculo→noche celestial (ADR-000 #1).

### OSIA-S0.7-H1 — packages/atmosphere: lógica pura
**Como** Dev/Operador **quiero** un motor de atmósfera puro y testeable **para** que cliente y servidor resuelvan EL MISMO cielo sin transmitir casi nada.

**Criterios de aceptación:**
- `packages/atmosphere` SIN I/O, sin Three.js, sin red, sin DB.
- Exporta `resolveAtmosphere(state, presets, t) -> AtmosphereParams` (función pura, idéntica en ambos lados), `interpolate/lerpParams` (OKLab/slerp/smoothstep), `scheduleEvents(seed, policies, start, end)` determinista.
- Tipos `AtmosphereParams`, `AtmospherePreset`, `AtmosphereState`, `AtmosphereEvent` versionados y re-exportados a `packages/shared`.

**Tareas técnicas:**
- [ ] Implementar `resolveAtmosphere` (resolución en capas por ejes timeOfDay/weather/season/biome/event con prioridad).
- [ ] `lerpParams` con OKLab para color, slerp para direcciones, smoothstep para floats, histéresis para fx/audio.
- [ ] PRNG sembrado (mulberry32) + easings compartidos; prohibir `Math.random` (lint).
- [ ] `scheduleEvents` determinista por seed+ventana.
- [ ] Tests unitarios puros (sin I/O) de resolución/interp/scheduling.

**DoD:** suite de tests verde; el motor no importa nada de Three/Node/red.

### OSIA-S0.7-H2 — 4 presets brutales + linter house-celestial
**Como** Visitante **quiero** ver 4 atmósferas distintas y bellas **para** que el mundo se sienta vivo y curado.

**Criterios de aceptación:**
- Presets autorados: `twilight-champagne`, `starlit-night`, `misty-dawn`, `warm-rain` (alineados a la paleta de marca).
- Linter de presets en CI valida el gamut `house-celestial` (colores permitidos/prohibidos, reglas de post-fx).

**Tareas técnicas:**
- [ ] Autorar los 4 presets (sky, fog, sun, moon, ambient, post, fx, audio, night).
- [ ] `HousePalette` `house-celestial` con gamuts permitidos/forbidden.
- [ ] Linter de presets como test en GitHub Actions.
- [ ] Documentar moods alternativos (A cálido / B neón / C brumoso) como paletas seleccionables (ADR-000).

**DoD:** 4 presets cargan y se ven brutales; linter pasa en CI.

### OSIA-S0.7-H3 — Ciclo día/noche server-authoritative + sincronización
**Como** Invitado **quiero** que el atardecer/noche sea EL MISMO para todos **para** compartir el momento (FOMO, exclusividad por diseño).

**Criterios de aceptación:**
- El world-server avanza `AtmosphereState` en el tick y emite `ATMOSPHERE_UPDATE` **solo en cambios** (targets de ejes + worldClock + transición).
- `worldClock.scale` ajustado para que un ciclo día/noche dure ~60-90 min (Fase 0) y dos amigos compartan atardeceres frecuentes.
- Un cliente que entra a mitad ve el mismo punto (sincronización de `worldClock` vía PING/PONG).

**Tareas técnicas:**
- [ ] Paso de atmósfera en el tick del server (paso 6); difusión `ATMOSPHERE_UPDATE` en cambios.
- [ ] `worldClock{epoch, scale}` + sincronización con serverTime (reusa PING/PONG de S0.5).
- [ ] Definir y validar `scale` (~60-90 min/ciclo).
- [ ] Cliente: aplicar estado y correr `resolveAtmosphere` localmente cada frame.

**DoD:** dos pantallas lado a lado muestran el mismo momento atmosférico; el cielo transiciona suave (sin snaps).

### OSIA-S0.7-H4 — Traductor AtmosphereParams → render (R3F)
**Como** Visitante **quiero** que el cielo, la niebla, las luces y el postFX cambien con la atmósfera **para** sentir que el mundo respira.

**Criterios de aceptación:**
- Un traductor mapea `AtmosphereParams` → color de cielo, `FogExp2` (color/densidad), dirección/color del sol y luna, intensidad ambiental, bloom/ACES/vignette/grade, partículas instanciadas y mezcla de audio (crossfade).
- El HUD "respira el cielo": `--atmo-tint`/`--atmo-glow`/`--atmo-contrast` se actualizan en runtime (contrato de [02-marca-design-system.md](../02-marca-design-system.md)).

**Tareas técnicas:**
- [ ] Hook que en cada frame corre `resolveAtmosphere` y aplica a la escena.
- [ ] Sol/luna direccionales con color y posición interpolada; estrellas en `starlit-night`.
- [ ] Partículas instanciadas (lluvia para `warm-rain`).
- [ ] Mezclador de audio ambiente con crossfade ligado al preset (ducking).
- [ ] Escribir CSS vars `--atmo-*` en runtime para el HUD.

**DoD:** al transicionar entre presets, cielo/niebla/luz/postFX/audio cambian de forma continua y bella; el HUD se tiñe con el cielo.

### OSIA-S0.7-H5 — Eventos efímeros deterministas (1-2)
**Como** Invitado **quiero** presenciar un evento raro (lluvia de meteoros) **para** sentir exclusividad y querer volver (FOMO).

**Criterios de aceptación:**
- 1-2 políticas de evento (`meteor-shower`, opcional `aurora`) programadas **deterministamente** por seed; ~1x/semana a hora "random" no anunciada.
- El evento es server-authoritative: `ATMOSPHERE_EVENT` se difunde; todos los presentes lo ven igual; solo se "caza" estando dentro.

**Tareas técnicas:**
- [ ] `AtmosphereEventPolicy` para `meteor-shower` (+ `aurora` opcional): rarity, window, hourBias, layer, cooldown.
- [ ] `scheduleEvents` integrado al worldClock del server; emisión de `ATMOSPHERE_EVENT`.
- [ ] Render del evento (capa parcial sobre el preset: meteoros instanciados / aurora shader simple).
- [ ] Para la demo F0: poder forzar el evento con un `seed`/comando reproducible.

**DoD:** un evento de meteoros ocurre de forma determinista, todos los presentes lo ven, y se puede reproducir con un seed para la demo.

---

## OSIA-S0.8 · Pulido, Rendimiento y Lanzamiento

- **Objetivo:** cerrar la fase: cumplir presupuestos de rendimiento, primera sesión guionizada (wow en el minuto 1, voz en 1 clic, sin tutorial pop-up, cierre sin "fin"), umbral cinematográfico de entrada, **deploy público** (Vercel + Hetzner) y la **sesión piloto** que valida el North Star.
- **Duración:** 1.5 semanas.
- **Dependencias:** todos los sprints anteriores.
- **Notas:** este sprint contiene la **puerta no-go** (F0-DoD-10). No se infla alcance: solo lo necesario para que la sesión piloto sea bella y medible.

### OSIA-S0.8-H1 — Performance budget pass
**Como** Dev/Operador **quiero** verificar y ajustar para cumplir los presupuestos F0 **para** que la escena se sienta fluida en máquinas reales.

**Criterios de aceptación:**
- 60 fps desktop / 30 fps mobile en el hardware de prueba; draw calls ≤ 150, triángulos ≤ 1M, VRAM ≤ 1 GB, primer frame ≤ 4 s desktop.
- 3 quality tiers (Ultra/Alto/Bajo) por detección de device; render scale como palanca.
- Test de dispose (entrar/salir 20x) sin fuga; reemplazar números "objetivo" del doc 08 por **mediciones reales**.

**Tareas técnicas:**
- [ ] Detección de device + FeatureFlag de quality tier; render scale ajustable.
- [ ] Orden de degradación: render scale → follaje → fog far → bloom → sombras → texturas (cara social al final).
- [ ] Performance budget check (manual/headless en CI) que falla si se superan los presupuestos.
- [ ] Re-ejecutar test de fuga de VRAM; documentar mediciones reales.

**DoD:** presupuestos verificados con números reales en el HUD; tiers funcionan; sin fuga.

### OSIA-S0.8-H2 — Primera sesión guionizada + umbral de marca
**Como** Invitado **quiero** una entrada cinematográfica y una primera sesión sin fricción **para** que el "wow" llegue en el minuto 1.

**Criterios de aceptación:**
- Onboarding ≤ 3 pasos (elegir nombre/handle → micro-elección de avatar/placeholder → cruzar el umbral). En F0 sin email (eso es Fase 1).
- Cruce con **fade de marca** (ThresholdTransition), splash de logo gold-on-dark, no carga de pestaña fea.
- Wow de atmósfera en el minuto 1; voz a 1 clic (push-to-talk descubrible); sin tutorial pop-up; cierre sin pantalla de "fin".

**Tareas técnicas:**
- [ ] Pantalla de entrada minimal (nombre + avatar) en `packages/ui` (estética de lujo, sin grilla de iconos).
- [ ] `ThresholdTransition` (fade de marca) entre entrada y mundo; splash con logo.
- [ ] Sonido: 2 ambientes (vestíbulo/dusk) + SFX de umbral; opt-in, silencio hasta primer gesto.
- [ ] Instrumentar el cruce del umbral como evento de experiencia.

**DoD:** un amigo nuevo entra, cruza el umbral con fade de marca y ve el cielo en < 60 s sin instrucciones.

### OSIA-S0.8-H3 — Deploy a producción (Vercel + Hetzner)
**Como** Dev/Operador **quiero** todo desplegado y accesible por URL **para** que amigos en máquinas distintas entren al mismo mundo.

**Criterios de aceptación:**
- world-client en **Vercel** (free); world-server + Redis + coturn en **Hetzner CX22** vía Docker (restart `unless-stopped`).
- Dominio/subdominio configurado; assets servidos desde Cloudflare R2 + CDN (o estático en F0 si R2 no está listo).
- Cloudflare proxy naranja oculta IP de Hetzner; security headers (HSTS/CSP/nosniff/frame DENY/Permissions-Policy mic=self); CORS allowlist (no `*`); secrets fuera de bundles de cliente (Doppler/env).

**Tareas técnicas:**
- [ ] Deploy de `world-client` a Vercel; variables `NEXT_PUBLIC_*`.
- [ ] Dockerfile de world-server; `docker compose` en Hetzner (world-server + redis + coturn), restart policy.
- [ ] Provisionar Hetzner CX22; firewall; Cloudflare (proxy, WAF managed, R2/CDN para assets).
- [ ] Security headers en world-client y endpoint de tickets; CORS/Origin allowlist.
- [ ] Secrets en Doppler/env (`WORLD_TICKET_SECRET`, etc.), nunca en cliente.
- [ ] Healthcheck del world-server con alerta a Discord.

**DoD:** URL pública viva; dos máquinas remotas entran a la misma instancia y se ven/oyen.

### OSIA-S0.8-H4 — Observabilidad mínima
**Como** Dev/Operador **quiero** logs y errores capturados **para** diagnosticar la sesión piloto y producción.

**Criterios de aceptación:**
- Pino en world-server (estructurado, sin datos sensibles); Sentry (free) en world-client y world-server con source maps.
- Métricas mínimas expuestas: conexiones WS, tick rate, bytes/tick.

**Tareas técnicas:**
- [ ] Pino con redacción de campos sensibles.
- [ ] Sentry en client + server + source maps.
- [ ] Endpoint/contadores `/metrics` mínimos (conexiones, tick, bytes).

**DoD:** errores llegan a Sentry; logs estructurados visibles; métricas básicas consultables.

### OSIA-S0.8-H5 — Sesión piloto y veredicto del North Star
**Como** Anfitrión (Carlos) **quiero** correr la sesión con 2-3 amigos y medir el "me quedo acá" **para** decidir go/no-go de la fase.

**Criterios de aceptación:**
- Sesión real con 2-3 personas en máquinas distintas: se ven, caminan juntos, hablan por voz, ven una transición de atmósfera y un evento efímero.
- Se registra cualitativamente la reacción (¿dijeron, sin que se les pida, "me quiero quedar acá"?).
- Métricas cualitativas/cuantitativas: duración de la 1ª sesión (>10 min objetivo), reacción al atardecer/evento, fricción de onboarding.
- Decisión documentada: **go** a Fase 1 o **no-go** (iterar mood ADR-000 o reevaluar).

**Tareas técnicas:**
- [ ] Guion de sesión piloto (qué mostrar, en qué orden; forzar evento por seed si hace falta).
- [ ] Captura de video + notas; mini-encuesta post-sesión.
- [ ] Registrar veredicto en `docs/adr` o bitácora; checklist F0-DoD-1..10.

**DoD:** sesión completada, veredicto del North Star documentado, decisión go/no-go tomada. **Cierre de Fase 0.**

---

## 4. Riesgos transversales de la Fase

| Riesgo | Impacto | Mitigación |
|---|---|---|
| El "wow" no llega (atmósfera no convence) | Crítico (no-go) | Foco obsesivo en S0.7; iterar mood (ADR-000 A/B/C); la atmósfera es el pilar #1, se le da el doble de tiempo si hace falta. |
| Networking propio (uWS) consume más de lo estimado | Alto (atrasa toda la fase) | Empezar S0.4 temprano; protocolo y AOI mínimos; reusar `applyMovement` compartida para evitar divergencia. |
| Voz P2P falla en NAT difícil | Medio | coturn TURN fallback desde el inicio; banco de pruebas de NAT en S0.6. |
| Fuga de VRAM en sesiones largas | Alto | `disposeScene` + test de fuga como tarea #2 (S0.2), no al final. |
| Foco fragmentado del dev (empleo) | Alto (cronograma) | Sprints lanzables/independientes; cada uno deja "algo que se ve"; holgura en la estimación total. |
| Sobre-ingeniería temprana | Medio | Anti-alcance explícito: terreno malla única, sin clipmap/streaming/dynamic-res en F0. |
| Costo de servidores | Bajo en F0 | Solo Hetzner CX22 (~$6/mes); resto free tier; IA apagada (Fase 2). |

## 5. Nota de continuidad hacia Fase 1
F0 deja **listos para reconectar** sin reescritura: el contrato `POST /world/tickets` + handshake WS por firma (Fase 1 los enchufa al SSO real de Supabase), `packages/shared` (red/atmósfera/enums), `packages/atmosphere` puro, el pipeline de assets y `packages/ui` con tokens de marca. La identidad efímera de F0 (handle) se sustituye por `Account/Profile` persistentes y el Vestíbulo delgado en Fase 1, **sin tocar el world-server**.
