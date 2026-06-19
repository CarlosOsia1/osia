# ADR-000 — Decisiones Abiertas de OSIA

> Propósito: Registrar las cuatro decisiones de diseño de OSIA (mood de atmósfera, recorrido, avatares y forma de El Vestíbulo) con contexto, opciones, pros/cons y RECOMENDACIÓN. **Estado: las 4 CONFIRMADAS por Carlos el 2026-06-19.** Incluye una plantilla reutilizable de ADR al final. | Estado: Borrador v1 | Fecha: 2026-06-19 | Parte del paquete de diseño OSIA.

---

## 0. Cómo leer este documento

Un **ADR** (Architecture Decision Record) captura **una decisión**, su **contexto**, las **opciones evaluadas** y sus **consecuencias**, para que el "yo del futuro" (y cualquiera que lea el repo) entienda *por qué* se hizo algo y no tenga que re-litigar lo ya decidido. La constitución de OSIA distingue dos clases de decisión:

- **Decisiones BLOQUEADAS** (por Carlos): no se discuten aquí; viven en la constitución y en los docs fundacionales (p. ej. low-poly + atmósfera, mundo instanciado, world-server propio sobre uWebSockets.js, NestJS hexagonal, **no launcher de iconos**). Ver [../00-vision-alcance.md](../00-vision-alcance.md) §11.
- **Decisiones ABIERTAS**: las **cuatro** de este documento. Tienen una **recomendación** clara para no bloquear el diseño, pero **no se cierran** hasta que Carlos confirme. El diseño avanza asumiendo la recomendación como *default*; si Carlos elige otra, se actualiza este ADR y se propaga.

> **Regla:** ninguna de estas decisiones bloquea la construcción. **Estado actual (2026-06-19): las CUATRO decisiones están ✅ CONFIRMADAS por Carlos** → #1 crepúsculo→noche celestial · #2 a pie · #3 avatares low-poly propios · #4 Bóveda Celeste. Los *defaults* recomendados se vuelven permanentes; el launcher de iconos quedó descartado. Este ADR queda como **registro histórico del porqué** de cada elección.

Las cuatro decisiones, su default recomendado y dónde impactan:

| # | Decisión abierta | Recomendación (default) | Impacto principal |
|---|---|---|---|
| **1** | Alma / mood de atmósfera | ✅ **CONFIRMADA: crepúsculo→noche celestial** | El "wow" del minuto 1; coherencia con la marca. Ver [../06-motor-atmosfera.md](../06-motor-atmosfera.md). |
| **2** | Recorrido | ✅ **CONFIRMADA: a pie** (núcleo social plaza) | Ritmo, proximidad, conversación. Ver [../01-pilares-experiencia.md](../01-pilares-experiencia.md) Pilar 2. |
| **3** | Avatares | ✅ **CONFIRMADA: low-poly propios estilizados** | Coherencia de marca, control, costo, identidad visible (pasaporte). |
| **4** | Forma de El Vestíbulo | ✅ **CONFIRMADA: Bóveda Celeste** (mapa de constelaciones; launcher de iconos **descartado**) | Cómo se entra al ecosistema. Ver [../03-arquitectura-sistema.md](../03-arquitectura-sistema.md) §2. |

Cross-links: [visión](../00-vision-alcance.md) · [pilares](../01-pilares-experiencia.md) · [marca/DS](../02-marca-design-system.md) · [arquitectura](../03-arquitectura-sistema.md) · [datos/ER](../04-modelo-datos-er.md) · [tiempo real](../05-realtime-mundo-networking.md) · [atmósfera](../06-motor-atmosfera.md) · [habitantes IA](../07-habitantes-ia.md) · [rendimiento](../08-estrategia-rendimiento.md) · [seguridad/infra/costos](../09-seguridad-infra-costos.md) · [contratos](../10-contratos-api-eventos.md) · [glosario](../11-glosario-dominio.md) · [roadmap](../backlog/00-roadmap-overview.md).

> **Estado real del proyecto:** esto es DISEÑO. La carpeta `OSIA/` solo contiene `/brand` y `/docs`. Nada está construido. Estas decisiones se ejecutan en Fase 0 (atmósfera, recorrido, avatares) y Fase 1 (Vestíbulo).

---

## ADR-000.1 — Alma / mood de la atmósfera

- **Estado:** ✅ **ACEPTADA** — confirmada por Carlos el 2026-06-19. Opción **A (crepúsculo→noche celestial)**. B/C/D quedan como paletas alternativas seleccionables del motor.
- **Fecha:** 2026-06-19
- **Decisores:** Carlos (fundador). Propone: revisor de coherencia.
- **Fase de impacto:** Fase 0 (`OSIA-S0.7` — Motor de Atmósfera v1).

### Contexto

La atmósfera es el **Pilar #1** y la apuesta estética central: lo que hace que el low-poly barato se sienta caro (ver [../06-motor-atmosfera.md](../06-motor-atmosfera.md)). El motor es combinatorio (ejes que se interpolan) y server-authoritative, así que técnicamente puede producir *muchos* moods; la pregunta abierta no es "¿qué moods soporta el motor?" sino **"¿cuál es el alma por defecto, la primera impresión, la paleta de la casa de Fase 0?"**. La disciplina de la fase es **3-4 atmósferas brutales**, no cuarenta a medias — así que esa "casa" debe elegirse bien. La marca es celestial/astral (champán sobre ónix, niebla marfil), lo que ya sesga la respuesta.

### Opciones

| Opción | Descripción | Presets de ejemplo |
|---|---|---|
| **A (recomendada) — Crepúsculo→noche celestial** | Blend de atardecer profundo a noche estrellada ónix; luz champán de lado, niebla marfil baja. Alineado 1:1 con la marca. | `twilight-champagne`, `starlit-night`, `misty-dawn`, `warm-rain` |
| **B — Cálido / hora dorada** | Mundo permanentemente bañado en oro cálido, mediterráneo, acogedor. | hora dorada larga, tarde ámbar |
| **C — Neón caribe** | Atmósfera vibrante, saturada, tropical-nocturna, luces de colores. | neón turquesa/magenta, noche tropical |
| **D — Brumoso misterioso** | Niebla densa, paleta apagada, melancólico, casi monocromo. | niebla espesa, gris perla, penumbra |

### Pros / Cons

| Opción | Pros | Cons |
|---|---|---|
| **A** | Coherencia total con marca (champán/ónix/marfil); el crepúsculo es universalmente "bello"; la transición día→noche es el ritual social natural ("vernos al atardecer"); el cielo nocturno es el lienzo perfecto para eventos efímeros (meteoros, aurora). | Riesgo de "otro juego de atardeceres"; exige tuneo fino para no caer en bloom genérico de 2010. |
| **B** | Cálido = acogedor, invita a quedarse; fácil de hacer agradable. | Menos "exclusivo/celestial"; sin noche, los eventos astrales (meteoros) pierden lienzo; menos contraste dramático. |
| **C** | Distintivo, memorable, "no lo tiene nadie". | Choca con la paleta de marca (saturación alta vs. contención champán/ónix); riesgo de verse barato/cargado; contradice "el arte de lo esencial". |
| **D** | Muy atmosférico y barato (la niebla esconde geometría); misterioso. | Puede sentirse deprimente/frío para un *lugar donde quedarse con amigos*; menos "lujo champán", más "horror sutil". |

### Recomendación

**Opción A — Blend crepúsculo→noche celestial.** Es la única que **deriva directamente de la marca** (celestial/astral, champán sobre ónix, niebla marfil), maximiza el "wow" del minuto 1, da el lienzo nocturno que los eventos efímeros necesitan, y respeta "el arte de lo esencial". B/C/D quedan **registradas como paletas seleccionables** del motor (`HousePalette` alternativas), no como el default — el motor combinatorio permite tenerlas sin costo de arquitectura, y podrían encenderse por zona/bioma en Fase 5 (`OSIA-S5.7`).

### Consecuencias

- **Positivas:** `packages/atmosphere` arranca con 4 presets celestiales tuneados; el linter de presets `house-celestial` (CI) protege el gamut; el HUD "respira el cielo" con tintes champán→fríos.
- **A vigilar:** se necesita tiempo desproporcionado de tuneo en `OSIA-S0.7` (es el pilar que decide el go/no-go de Fase 0). Si el veredicto humano falla (`F0-DoD-10`), **se itera el mood probando B/C/D antes de abandonar el concepto** (es la palanca de la puerta no-go).
- **Si Carlos elige B/C/D:** se cambia la `HousePalette` por defecto y se reautoran los 4 presets; **no** cambia el motor ni el contrato de red. Costo: días de autoría, no semanas de ingeniería.

---

## ADR-000.2 — Recorrido: a pie vs. vehículo contemplativo

- **Estado:** ✅ **ACEPTADA** — confirmada por Carlos el 2026-06-19. Opción **A (a pie)**. El vehículo contemplativo queda como frontera móvil de Fase 5.
- **Fecha:** 2026-06-19
- **Decisores:** Carlos. Propone: revisor de coherencia.
- **Fase de impacto:** Fase 0 (`OSIA-S0.3` — avatar + locomoción).

### Contexto

OSIA es un *lugar para estar con gente*, no un juego de objetivos. **Cómo se mueve uno por el mundo** define el ritmo de la sesión, la proximidad entre amigos y, por lo tanto, cuánta conversación emerge (ver Pilar 2 — Presencia, [../01-pilares-experiencia.md](../01-pilares-experiencia.md)). La constitución ya marca "a pie" como núcleo y el "vehículo modo contemplativo (estilo Yugo)" como feature/zona posterior; esta decisión confirma esa jerarquía para Fase 0.

### Opciones

| Opción | Descripción |
|---|---|
| **A (recomendada) — A pie (núcleo social plaza)** | Movimiento a velocidad humana, cámara tercera persona, física kinematic (Rapier). La proximidad fuerza la conversación. |
| **B — Vehículo contemplativo (más Yugo)** | Conducir/planear lento por paisajes, cámara cinematográfica, recorrido como contemplación en movimiento. |
| **C — Híbrido desde el día 1** | Las dos cosas simultáneamente en Fase 0. |

### Pros / Cons

| Opción | Pros | Cons |
|---|---|---|
| **A** | "Caminar lento juntos *es* el contenido social"; máxima proximidad y voz P2P natural; locomoción a pie es la más barata y conocida de implementar; encaja con la plaza/hub instanciado. | Menos sensación de "viaje épico"; mundos pequeños pueden sentirse limitados sin algo más. |
| **B** | Sensación de viaje/escala; muy fotogénico para el contenido de marketing; el ritmo lento de un vehículo es muy "lujo contemplativo". | Aleja a los amigos (cada uno en su vehículo) → menos conversación; más complejo (física de vehículo, mundos más grandes que streamear); contradice la plaza social íntima de Fase 0. |
| **C** | Lo mejor de ambos. | **Inviable para un dev solo en Fase 0**: dobla el alcance del sprint de locomoción y de diseño de mundo; rompe el principio depth-first. |

### Recomendación

**Opción A — A pie.** Es el núcleo social, el más barato, el que genera conversación y el coherente con el hub/plaza instanciado de Fase 0. El **vehículo contemplativo (B)** queda explícitamente como **frontera móvil**: una **zona/feature posterior** (Fase 5, `OSIA-S5.7`, biomas/zonas nuevas), no parte del núcleo. C se descarta por scope.

### Consecuencias

- **Positivas:** `OSIA-S0.3` implementa un solo controlador (capsule kinematic); `applyMovement` vive en `packages/shared` (idéntica cliente↔servidor) y el modelo de zonas soporta más adelante una zona "contemplativa" sin reescribir el world-server.
- **A vigilar:** el mundo de Fase 0 debe ser lo bastante denso/bello para no sentirse pequeño a pie (lo resuelve la atmósfera + un mirador diseñado, no más metros).
- **Si Carlos elige B:** se redefine `OSIA-S0.3` hacia un controlador de vehículo y el mundo crece (impacta rendimiento/streaming, [../08-estrategia-rendimiento.md](../08-estrategia-rendimiento.md)); cambio de alcance **medio**, recomendable solo si la conversación social no es el objetivo #1 de la primera sesión.

---

## ADR-000.3 — Avatares: propios low-poly vs. Ready Player Me

- **Estado:** ✅ **ACEPTADA** — confirmada por Carlos el 2026-06-19. Opción **A (avatares low-poly propios estilizados)**. RPM queda como fallback documentado, no default.
- **Fecha:** 2026-06-19
- **Decisores:** Carlos. Propone: revisor de coherencia.
- **Fase de impacto:** Fase 0 (`OSIA-S0.3-H2`, avatar base) y Fase 1 (`OSIA-S1.6`, editor de avatar / pasaporte).

### Contexto

El avatar es la **presencia** del jugador en El Mundo y la **cara del pasaporte** (identidad visible en todo el ecosistema). Debe coincidir con la estética low-poly + atmósfera y con la paleta de marca, y debe ser **barato** de producir y mantener para un dev solo. La constitución modela `avatars.kind` con dos valores: `lowpoly | rpm`, dejando la puerta abierta a ambos; esta decisión fija el **default de v1**.

### Opciones

| Opción | Descripción |
|---|---|
| **A (recomendada) — Avatares low-poly propios estilizados** | Modelo base propio (o CC0 estilizado) con partes/colores configurables dentro de la paleta de marca; cosméticos como capa encima. |
| **B — Ready Player Me (RPM)** | Integrar el SDK de RPM: avatares de cuerpo completo generados/importados por el usuario. |
| **C — Híbrido (RPM como atajo de Fase 0, propios después)** | Arrancar con RPM para no modelar nada, migrar a propios cuando haya tiempo. |

### Pros / Cons

| Opción | Pros | Cons |
|---|---|---|
| **A** | Coherencia total con marca (champán/ónix, low-poly); control absoluto del estilo y del presupuesto de polígonos/VRAM; los cosméticos (economía Fase 4-5) encajan limpio; sin dependencia de un tercero ni de su estética. | Hay que modelar/conseguir el base y un editor mínimo (trabajo de arte que Carlos prefiere evitar). |
| **B** | Cero modelado; sistema de personalización maduro "gratis"; los usuarios traen su avatar. | Estética RPM (semi-realista, cuerpo completo) **choca** con low-poly celestial → rompe la coherencia; dependencia externa (SDK, disponibilidad, ToS); avatares más pesados (rendimiento); difícil casar con la paleta y los cosméticos propios. |
| **C** | Desbloquea Fase 0 sin arte; permite validar el "wow" antes de invertir en avatares. | Genera **deuda de migración** (dos sistemas de avatar, dos pipelines de cosméticos); riesgo de quedarse en RPM "por ahora" para siempre y traicionar la coherencia. |

### Recomendación

**Opción A — Avatares low-poly propios estilizados.** Es la única que preserva la coherencia de marca, el control de costo/rendimiento y la economía cosmética propia. Para **mitigar el costo de arte en Fase 0**, el default acepta un **atajo acotado**: un **único avatar base** CC0/estilizado con animaciones idle/walk (`OSIA-S0.3-H2`), dejando el **editor de partes/colores** para Fase 1 (`OSIA-S1.6`). RPM se mantiene como *fallback documentado* (`avatars.kind='rpm'` ya existe en el ER) si el costo de arte bloquea el avance, **pero no como default**.

### Consecuencias

- **Positivas:** el campo `avatars.config jsonb` (ER, [../04-modelo-datos-er.md](../04-modelo-datos-er.md) §3.1) modela partes/colores/cosméticos sin migración futura; los cosméticos de Fase 4-5 se equipan sobre el mismo modelo; rendimiento controlado.
- **A vigilar:** conseguir/animar un base low-poly bello es trabajo real; si se atasca, activar el fallback RPM **temporal** y registrarlo como deuda explícita.
- **Si Carlos elige B (RPM):** se documenta como decisión de coherencia y se ajustan paleta/cosméticos para convivir con RPM; impacto en rendimiento y en el sistema de cosméticos. Cambio **medio-alto** en coherencia de marca.

---

## ADR-000.4 — Forma de El Vestíbulo (modelo de conexión del ecosistema)

- **Estado:** ✅ **ACEPTADA** — confirmada por Carlos el 2026-06-19. Opción **A (Bóveda Celeste / mapa de constelaciones)**. Carlos además ratifica el invariante: **cada app es accesible por deep-link directo sin pasar por la Bóveda** (la Bóveda es la puerta de lujo, no un peaje).
- **Fecha:** 2026-06-19 (confirmada)
- **Decisores:** Carlos. Propone: revisor de coherencia.
- **Fase de impacto:** Fase 1 (`OSIA-S1.7` — El Vestíbulo delgado).

### Contexto

OSIA es una **constelación de apps independientes** unidas por **identidad/pasaporte compartido (SSO)** y por **El Vestíbulo** (`apps/web`), un punto de entrada de lujo que presenta tu pasaporte y unas pocas "puertas" a cada experiencia. La **decisión de modelo de producto ya está BLOQUEADA** (ecosistema modular, SSO, deep-links) y, dentro de ella, **el launcher tipo teléfono / grilla de iconos está DESCARTADO explícitamente por Carlos** (se siente genérico, no exclusivo). Lo que queda **abierto** es la **forma visual/conceptual concreta** del Vestíbulo. Ver [../03-arquitectura-sistema.md](../03-arquitectura-sistema.md) §2 y [../02-marca-design-system.md](../02-marca-design-system.md) §7.3.

> **Lo cerrado vs. lo abierto:** *cerrado* = NO launcher de iconos, NO kernel que orqueste apps, SSO + deep-links + Vestíbulo conector. *Abierto* = **cuál de las formas de Vestíbulo** se elige. **El launcher de iconos queda fuera en TODAS las opciones de abajo.**

### Opciones

| Opción | Descripción |
|---|---|
| **A (recomendada) — Mapa de constelaciones / vestíbulo de club privado** | Fondo ónix celeste, pasaporte presente, cada experiencia es una **constelación/puerta** que se ilumina; pocas, curadas, mucho espacio negativo; cruzar una puerta es un gesto cinematográfico. |
| **B — Vestíbulo editorial tipo revista de lujo** | Índice curado estilo portada/editorial: tipografía Italiana grande, secciones, una "revista" de tu OSIA. |
| **C — Entrada diegética dentro de El Mundo** | No hay landing 2D: entras a El Mundo y las otras apps son **portales físicos** in-world (lobby vivo). |
| **D — Minimalismo extremo** | Solo el pasaporte + un conmutador discreto, sin landing cinematográfico. |
| **~~E~~ — Launcher de iconos** | **DESCARTADA por Carlos.** Genérica, fría, mata el aura de lujo. Aquí solo para constancia. |

### Pros / Cons

| Opción | Pros | Cons |
|---|---|---|
| **A** | Máxima coherencia con marca celestial; "puerta/constelación" justifica *no-grilla*; el cruce de umbral es ritual (motion de lujo); escala bien (nace con 1 puerta, gana puertas). | Más diseño de motion/composición que un menú; hay que evitar que "constelación" se vuelva decorado vacío. |
| **B** | Muy "lujo editorial"; excelente para contenido/marketing; aprovecha Italiana. | Una revista puede sentirse **estática/contenido**, no *umbral a un lugar*; menos "entrar a un club", más "leer sobre él". |
| **C** | Inmersión total (todo es El Mundo); coherente con "portales diegéticos" futuros. | **Rompe el deep-link** (obliga a pasar por El Mundo para llegar a Social/Juegos) y contradice "apps independientes accesibles por separado"; acopla el Vestíbulo al engine 3D (pesado); mal para Fase 1 (depth-first). |
| **D** | El más barato y rápido; máxima contención. | Quizá *demasiado* austero para el primer momento de marca; pierde el "wow" del umbral; el pasaporte solo no comunica "ecosistema". |

### Recomendación

**Opción A — Vestíbulo celeste tipo mapa de constelaciones / club privado.** Es la que mejor encarna "el arte de lo esencial" siendo a la vez un *umbral de lujo* (no un trámite ni una revista estática), justifica visualmente el **no-launcher**, y escala con el modelo depth-first (nace delgado: pasaporte + 1 puerta a El Mundo en Fase 1, gana puertas en Fases 3/4). El **conmutador discreto de D** se adopta como **componente secundario** (el `AppSwitcher` para saltar entre apps ya *dentro* de una experiencia). C (diegético) queda como **evolución futura opcional** ("portales internos en El Mundo", coherente con la constitución), **no** como reemplazo del Vestíbulo. B se descarta como forma principal pero inspira el tono editorial del copy.

### Consecuencias

- **Positivas:** `apps/web` implementa `PassportCard` + `ExperienceThreshold` + `ThresholdTransition` + `AppSwitcher` (ver [../02-marca-design-system.md](../02-marca-design-system.md) §7.3); el catálogo declarativo `packages/shared/experiences.ts` alimenta las puertas (agregar app = agregar entrada + desplegar, [../03-arquitectura-sistema.md](../03-arquitectura-sistema.md) §2.3); deep-links intactos.
- **A vigilar:** el cruce de umbral es el motion "más caro" del sistema; debe degradar con `prefers-reduced-motion`. No dejar que "constelación" se vuelva ruido visual (contradiría el silencio/espacio negativo).
- **Si Carlos elige B/C/D:** **NO** cambia la arquitectura (SSO + deep-links + catálogo declarativo siguen igual); cambia la **capa de presentación** de `apps/web`. C es la única con impacto arquitectónico real (acopla al 3D, rompe deep-link) y debe pensarse dos veces. El launcher de iconos **no es elegible**.

---

## Plantilla reutilizable de ADR

> Copiar este bloque a `docs/adr/ADR-NNN-titulo-kebab-case.md` para una nueva decisión. Numerar secuencial (ADR-001, ADR-002…). Mantener una decisión por archivo (salvo este ADR-000 que agrupa las cuatro abiertas iniciales). Convención de nombre: `ADR-NNN-kebab-case.md` (ver [../11-glosario-dominio.md](../11-glosario-dominio.md) §4.4).

```markdown
# ADR-NNN — <Título de la decisión>

> Propósito: <una línea>. | Estado: <Propuesta | Aceptada | Pendiente de confirmación de Carlos | Rechazada | Reemplazada por ADR-MMM | Obsoleta> | Fecha: YYYY-MM-DD | Parte del paquete de diseño OSIA.

- **Estado:** <Propuesta | Aceptada | Pendiente de confirmación de Carlos | Rechazada | Reemplazada por ADR-MMM>
- **Fecha:** YYYY-MM-DD
- **Decisores:** <quién decide; quién propone>
- **Fase de impacto:** <Fase / sprint(s) OSIA-SX.Y afectados>
- **Relacionada con:** <ADRs, docs por ruta relativa>

## Contexto

<El problema o fuerza que obliga a decidir. Qué está en juego, qué restricciones aplican (~250 USD, dev solo, marca, depth-first). Por qué ahora.>

## Opciones

| Opción | Descripción |
|---|---|
| **A (recomendada)** | <…> |
| **B** | <…> |
| **C** | <…> |

## Pros / Cons

| Opción | Pros | Cons |
|---|---|---|
| **A** | <…> | <…> |
| **B** | <…> | <…> |
| **C** | <…> | <…> |

## Recomendación

<La opción recomendada y POR QUÉ esta y no las otras. Concreto, no genérico.>

## Consecuencias

- **Positivas:** <qué habilita / simplifica.>
- **A vigilar:** <riesgos, deuda, lo que hay que monitorear.>
- **Si se elige otra opción:** <costo de cambiar; qué se toca y qué no.>

## Notas de cumplimiento (opcional)

<Cómo se verifica que la decisión se respeta: lint, test, revisión de diseño, criterio de DoD.>
```

---

> Este ADR vive: cuando Carlos confirme una decisión, cambiar su **Estado** a "Aceptada" (con fecha) y propagar a los docs afectados. Si una decisión se revierte, crear un **nuevo ADR** que la reemplace y marcar la vieja como "Reemplazada por ADR-NNN" — nunca borrar el historial. La coherencia del paquete depende de que esto se mantenga al día. Ver índice maestro en [../README.md](../README.md).
