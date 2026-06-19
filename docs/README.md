# Paquete de Diseño OSIA — Índice Maestro

> Propósito: Ser la puerta de entrada al paquete de diseño de OSIA — qué es OSIA, tabla de contenidos enlazando cada documento, cómo leerlo según tu rol, el estado real del proyecto y los próximos pasos. | Estado: Borrador v1 | Fecha: 2026-06-19 | Parte del paquete de diseño OSIA.

---

## Qué es OSIA (en 3 líneas)

**OSIA** es un **ecosistema de un mundo atmosférico de lujo, por invitación**: una **constelación de experiencias independientes** (El Mundo, La Red Social, Los Juegos, futuras), cada una su propia app deep-linkable, unidas por un **pasaporte compartido (SSO)** y por **El Vestíbulo** —un acceso celeste minimal, **no** un launcher de iconos—. La experiencia insignia es **El Mundo**: un mundo low-poly que se recorre **a pie** con amigos, vivo por su **motor de atmósfera** (hora/clima/estación/eventos) y habitado por **agentes de IA** para que nunca se sienta vacío. El tagline manda sobre todo: **"El arte de lo esencial"** — lujo es contención, escasez, atmósfera y curaduría, no vastedad.

---

## Tabla de contenidos

Lee los docs en orden numérico para una comprensión completa; o salta al que te interese. Cada uno es fundacional de su área.

| # | Documento | Una línea |
|---|---|---|
| 00 | [00-vision-alcance.md](./00-vision-alcance.md) | Por qué y qué: problema/enemigos, north star, modelo de producto (ecosistema), alcance/anti-alcance, GTM, negocio, métricas, riesgos. |
| 01 | [01-pilares-experiencia.md](./01-pilares-experiencia.md) | Qué se siente: marco del ecosistema (Vestíbulo + pasaporte), 6 pilares, loops, player journey y guion minuto a minuto de la primera sesión. |
| 02 | [02-marca-design-system.md](./02-marca-design-system.md) | Marca y Design System (`packages/ui`): tokens (color/tipografía/espaciado/motion/sonido), componentes web, El Vestíbulo, Pasaporte, HUD del Mundo, accesibilidad. |
| 03 | [03-arquitectura-sistema.md](./03-arquitectura-sistema.md) | Arquitectura: monorepo modular, apps independientes + SSO + Vestíbulo (sin launcher), C4, world-server, API hexagonal, despliegue y escalado. |
| 04 | [04-modelo-datos-er.md](./04-modelo-datos-er.md) | Modelo de datos (ER): entidades por bounded context, diagramas Mermaid, tipos Postgres, claves/índices, pgvector, RLS, migraciones. |
| 05 | [05-realtime-mundo-networking.md](./05-realtime-mundo-networking.md) | Tiempo real: world-server autoritativo (uWebSockets.js), rooms/instancias, tick fijo, AOI, predicción/reconciliación, protocolo binario, voz WebRTC. |
| 06 | [06-motor-atmosfera.md](./06-motor-atmosfera.md) | Motor de atmósfera (`packages/atmosphere`, lógica pura): ejes combinatorios, interpolación, presets, determinismo y scheduler de eventos efímeros (FOMO). |
| 07 | [07-habitantes-ia.md](./07-habitantes-ia.md) | Habitantes de IA: persona/memoria/voz, pipeline Whisper→Claude→TTS, memoria con pgvector, conciencia del mundo y guardarrailes de costo. |
| 08 | [08-estrategia-rendimiento.md](./08-estrategia-rendimiento.md) | Rendimiento: presupuestos (fps/draw calls/VRAM/red), LOD, "distant horizons", instancing, culling, KTX2/Draco, streaming, adaptive quality. |
| 09 | [09-seguridad-infra-costos.md](./09-seguridad-infra-costos.md) | Seguridad, infraestructura y costos: auth/RLS/rate-limit/anti-cheat, sizing Hetzner/Supabase/Cloudflare, matemática del runway, guardarrailes de costo. |
| 10 | [10-contratos-api-eventos.md](./10-contratos-api-eventos.md) | Contratos (`packages/shared`): convenciones REST, catálogo de endpoints y eventos WebSocket, API de diálogo IA, errores y tipos compartidos. |
| 11 | [11-glosario-dominio.md](./11-glosario-dominio.md) | Glosario y lenguaje ubicuo (es-CO): término→definición, bounded contexts, convenciones de nombres (entidades/tablas/eventos/ramas/commits) y siglas. |

### Decisiones y plan de ejecución

| Documento | Una línea |
|---|---|
| [adr/ADR-000-decisiones-abiertas.md](./adr/ADR-000-decisiones-abiertas.md) | Las 4 decisiones abiertas (mood de atmósfera, recorrido, avatares, forma del Vestíbulo) con recomendación + plantilla reutilizable de ADR. |
| [backlog/00-roadmap-overview.md](./backlog/00-roadmap-overview.md) | Roadmap: timeline de las 6 fases, índice de los 52 sprints, gates "lanzable" y secuencia para un dev solo. |
| [backlog/fase-0-el-sentimiento.md](./backlog/fase-0-el-sentimiento.md) | Backlog Fase 0: de carpeta vacía a la primera escena bella jugable (caminar + voz + atmósfera viva). |
| [backlog/fase-1-identidad.md](./backlog/fase-1-identidad.md) | Backlog Fase 1: cuentas persistentes, pasaporte SSO, perfil/avatar y El Vestíbulo delgado. |
| [backlog/fase-2-mundo-vivo.md](./backlog/fase-2-mundo-vivo.md) | Backlog Fase 2: Habitantes de IA, atmósfera completa y eventos; el mundo respira. |
| [backlog/fase-3-tejido-social.md](./backlog/fase-3-tejido-social.md) | Backlog Fase 3: La Red Social (feed, seguidores, presencia, notificaciones) como app independiente. |
| [backlog/fase-4-juego-estatus.md](./backlog/fase-4-juego-estatus.md) | Backlog Fase 4: Los Juegos con ranking global, logros y cosméticos; el estatus se luce. |
| [backlog/fase-5-hacia-gigante.md](./backlog/fase-5-hacia-gigante.md) | Backlog Fase 5+: plots, economía que paga servidores, apertura controlada, voz a escala y self-host. |

---

## Cómo leer este paquete

- **Si quieres el porqué y la estrategia:** empieza por 00 (visión) → 01 (pilares) → ADR-000 (decisiones abiertas). Suficiente para entender la apuesta.
- **Si vas a construir (Carlos):** 03 (arquitectura) → 04 (datos) → 05 (tiempo real) → 06 (atmósfera) → backlog/00-roadmap → `fase-0`. Ese es el camino de ejecución.
- **Si trabajas en lo visual/UX:** 02 (marca/DS) + 01 (experiencia) + la sección de Vestíbulo en ADR-000.
- **Si trabajas en IA o costos:** 07 (habitantes IA) + 09 (seguridad/infra/costos) + 10 (contratos).
- **Cuándo dudes de un nombre:** 11 (glosario). Es la fuente única del lenguaje; un término, un significado, en todas partes.

> **Regla de oro:** toda decisión técnica debe poder rastrearse hasta una afirmación de la visión (00). Si una decisión de ingeniería contradice la visión, gana la visión —o se actualiza con un ADR explícito.

---

## Estado del proyecto

- **Estado real (honestidad ante todo):** la carpeta `OSIA/` está **vacía salvo `/brand` y `/docs`**. **Nada de código está construido.** Esto es **diseño**, no documentación de algo existente. Cuando un doc dice "el jugador hace X", léase "debe poder hacerlo cuando se implemente en la fase indicada".
- **Activos reales en disco:** marca registrada en `brand/` — logos (gold-on-dark principal, gold, ivory, onyx, favicons) en `brand/logos`; tipografías Italiana + Jost (SIL OFL) en `brand/fonts`; paleta bloqueada (Champán `#CBB89A` · Ónix `#0D0D0D` · Marfil `#F5F1E8` · Taupe `#8C7B66`).
- **Restricciones guía:** ~250 USD de capital, runway de servidores ~2 meses, **un solo dev** (Carlos) con foco fragmentado. La restricción #1 no es la plata: es el **camino más corto a algo bello y jugable que mantenga el momentum**.
- **Decisiones bloqueadas:** ecosistema modular (constelación de apps), **no launcher de iconos**, SSO + Vestíbulo, depth-first, low-poly + atmósfera, mundo instanciado, world-server propio (uWebSockets.js), NestJS hexagonal, voz P2P, habitantes IA, motor de atmósfera server-authoritative, F2P (cosméticos/estatus/escasez), invite-only. Ver [00-vision-alcance.md](./00-vision-alcance.md) §11.
- **Decisiones abiertas:** 4, con recomendación, pendientes de confirmación de Carlos. Ver [adr/ADR-000-decisiones-abiertas.md](./adr/ADR-000-decisiones-abiertas.md).

---

## Próximos pasos

1. **Confirmar ADR-000** — las 4 decisiones abiertas (mood de atmósfera, recorrido a pie, avatares propios, Vestíbulo tipo constelación), o aceptar explícitamente los *defaults* recomendados. El launcher de iconos ya está descartado.
2. **Arrancar Fase 0, Sprint `OSIA-S0.1`** (Cimientos del Monorepo y CI): `pnpm + Turborepo`, estructura bloqueada del monorepo, CI verde en `main`. Ver [backlog/fase-0-el-sentimiento.md](./backlog/fase-0-el-sentimiento.md).
3. **Objetivo único de Fase 0:** que un amigo entre a la primera escena y diga **"uy, yo me quedo acá"**. Si eso pasa, ganamos. Todo lo demás es consecuencia.

---

> **El arte de lo esencial.** Un lugar celeste, por invitación, que respira solo. No lo construimos enorme: lo construimos **diminuto y perfecto**, una superficie profunda a la vez, y dejamos que la belleza sea la razón para volver.
