# ADR-001 — Estrategia de validación de contratos en `@osia/shared` (Zod + branded IDs)

> Propósito: fijar cómo se valida y se tipa el contrato de red de OSIA — branded IDs ahora, Zod diferido a Fase 1 — sin pagar el costo de Zod en el hot path de 20 Hz. | Estado: Aceptada | Fecha: 2026-06-23 | Parte del paquete de diseño OSIA.

- **Estado:** Aceptada — confirmada por Carlos el 2026-06-23.
- **Fecha:** 2026-06-23
- **Decisores:** Carlos (fundador). Propone: revisor de coherencia (Claude).
- **Fase de impacto:** Fase 0 (`OSIA-S0.4`/`OSIA-S0.5`, contrato de red) y Fase 1 (`OSIA-S1.1`/`OSIA-S1.3`, bordes REST de identidad).
- **Relacionada con:** [CLAUDE.md](../../CLAUDE.md) §1.2/§5/§7, [docs/05-realtime-mundo-networking.md](../05-realtime-mundo-networking.md), [docs/10-contratos-api-eventos.md](../10-contratos-api-eventos.md), decisión SHD-02 (cuantización diferida, en `packages/shared/src/net/codec.ts`).

## Contexto

[CLAUDE.md §5](../../CLAUDE.md) exige dos cosas para `@osia/shared`: **(a)** validación con **Zod** en los bordes (cliente para UX, servidor para seguridad) y **(b)** **IDs branded** (`AccountId`, `EntityId`) para evitar *primitive obsession* (§1.2). La auditoría de cierre de Fase 0 encontró que **ninguna** de las dos existía: cero esquemas Zod en el repo y todos los ids como `number`/`string` crudos.

La tensión es con [§7](../../CLAUDE.md) (rendimiento): el camino caliente (`INPUT`/`DELTA` a 20 Hz × N jugadores) tiene presupuesto de **cero asignaciones por frame**. Correr un parser Zod sobre cada mensaje binario entrante en cada tick asigna objetos y quema CPU justo en el lazo más sensible. Además, en Fase 0 **no existen bordes REST**: la única superficie "fría" es el endpoint de emisión de world tickets; los bordes de negocio (signup, waitlist, invitaciones, perfil) **llegan en Fase 1** (`apps/api`). Decidir "Zod en todo, ya" sería pagar una dependencia y un patrón por una superficie que aún no existe, y meterlo donde hace daño (hot path).

## Opciones

| Opción | Descripción |
|---|---|
| **A (recomendada)** | **Branded IDs ya** (`EntityId` aplicado en el contrato + acuñado en el server). **Zod diferido a Fase 1**, cuando aparezcan los bordes REST de identity en `apps/api`. El hot path binario sigue validándose por **bounds-check del codec + clamps manuales** (rango de input, `dt`, `kind`, flags), por diseño y por perf (§7). |
| **B** | Branded IDs ya **y** adoptar Zod ya, pero solo en los bordes fríos de F0 (body de `POST /world/tickets` + validación de env). Hot path exento. |
| **C** | Registrar el ADR difiriendo **ambos** (branded IDs y Zod) a Fase 1; no tocar `@osia/shared` en este pase. |

## Pros / Cons

| Opción | Pros | Cons |
|---|---|---|
| **A** | Cierra la deuda de tipos (§1.2/§5) hoy, que es barata y type-only (cero runtime). No mete Zod donde hace daño. Deja el patrón de bordes para cuando exista la superficie real (F1). | Zod queda como deuda explícita (mitigado: documentada aquí y barata de pagar en F1). |
| **B** | Más fiel a la letra de §5 ya. | Mete la dependencia `zod` en F0 por **un** endpoint; el costo de mantener el patrón no se amortiza hasta F1. |
| **C** | Mínimo cambio ahora. | Deja sin cerrar una deuda (branded IDs) que es barata HOY y carísima de retrofitear cuando `identity` (F1) multiplique los ids (§0.4). |

## Recomendación

**Opción A.** Los branded IDs son el caso de "rehacer hoy es barato" (§0.4): son **type-only** (cero costo en runtime; `EntityId = number & brand`), y cuando llegue `AccountId` persistente en Fase 1 ya existirá el tipo para no mezclar identificadores. Zod, en cambio, es un patrón de **bordes**, y los bordes de OSIA son de Fase 1 (`apps/api` hexagonal). Forzarlo en el hot path binario de F0 contradice §7; ponerlo en el único endpoint frío de F0 no amortiza la dependencia. La validación del hot path ya existe y es la correcta para su contexto: **bounds-check estructural** en el `Reader` del codec (rechaza frames truncados/mentirosos) + **clamps manuales** en el server (`clampUnit`, `dt`, `kind ≤ 3`, `flags & 0x07`) antes de tocar la simulación.

## Consecuencias

- **Hecho en este pase (Fase 0):**
  - `packages/shared/src/domain/ids.ts`: `EntityId`, `AccountId` (branded) + constructores `asEntityId`/`asAccountId` (única puerta de creación, en el borde del decode).
  - `EntityId` aplicado en el contrato (`net/entities.ts`, `messages.ts`) y propagado al server (acuñado en `index.ts`, mapas keyed por `EntityId` en `instance.ts`) y al cliente (cast de borde en `NetClient.sendVoiceSignal`).
- **Diferido a Fase 1 (queda como deuda explícita, no como olvido):**
  - Adoptar `zod` en `@osia/shared/schemas` y validar los bordes REST de `apps/api` (`SignupInput`, `WaitlistInput`, `RedeemInvitationInput`, `VerifyEmailInput`, body de `POST /v1/world/tickets`). Cliente para UX, servidor para seguridad.
  - `AccountId` pasa de efímero (derivado del handle en F0) a `accounts.id` persistente del pasaporte.
- **Invariante que se mantiene:** el hot path binario **no** usa Zod por diseño (perf §7); su defensa es el bounds-check del codec + clamps en el server. Si un futuro PR propone Zod en el tick, debe re-litigar este ADR.
- **No cambia** la decisión SHD-02 (cuantización/bitmask/msgpack diferidos hasta medir que se supera 1.5 KB/jugador/tick), que es ortogonal y vive en `codec.ts`.
