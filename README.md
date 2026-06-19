<div align="center">

# OSIA

**El arte de lo esencial.**

Un ecosistema de lujo por invitación — una _constelación_ de experiencias
independientes (El Mundo, La Red Social, Los Juegos), unidas por un Pasaporte
compartido y **La Bóveda Celeste**.

</div>

---

## ¿Qué es este repo?

El monorepo de todo el ecosistema OSIA. El **diseño completo** (visión, arquitectura,
ER, motor de atmósfera, IA, rendimiento, seguridad, contratos y el backlog de 52 sprints)
vive en [`docs/`](./docs/README.md). Empieza por ahí.

> **Estado:** Fase 0 (El Sentimiento) · Sprint `OSIA-S0.1` (Cimientos del Monorepo). Ver
> [`docs/backlog/00-roadmap-overview.md`](./docs/backlog/00-roadmap-overview.md).

## Requisitos

- **Node 20 LTS** (ver `.nvmrc`)
- **pnpm 10** (`corepack enable` o instalación manual)
- **Docker** (para Redis/Postgres de desarrollo)

## Puesta en marcha

```bash
pnpm install            # instala todo el workspace
cp .env.example .env    # configura tus variables locales
pnpm dev:infra          # levanta Redis + Postgres (Docker)
pnpm build              # compila todas las apps/packages (Turborepo)
```

## Scripts (raíz)

| Script | Qué hace |
|---|---|
| `pnpm dev` | Arranca el modo desarrollo de todas las apps (Turborepo). |
| `pnpm build` | Compila todo el workspace. |
| `pnpm lint` | ESLint en todo el workspace. |
| `pnpm typecheck` | `tsc --noEmit` en cada paquete. |
| `pnpm test` | Tests de cada paquete. |
| `pnpm format` | Prettier (escribe). |
| `pnpm dev:infra` / `:down` | Levanta / apaga Redis + Postgres (Docker). |

## Estructura

```
OSIA/
├── apps/
│   ├── world-client/   # EL MUNDO (Next.js + React Three Fiber)   · S0.2+
│   ├── world-server/   # Servidor autoritativo (Node + uWebSockets.js) · S0.4+
│   ├── web/            # EL VESTÍBULO + identidad (placeholder)   · Fase 1
│   ├── api/            # Backend NestJS hexagonal (placeholder)   · Fase 1
│   ├── social/         # LA RED SOCIAL (placeholder)              · Fase 3
│   └── games/          # LOS JUEGOS (placeholder)                 · Fase 4
├── packages/
│   ├── shared/         # Tipos, contratos de red, eventos
│   ├── atmosphere/     # Motor de Atmósfera (lógica pura compartida)
│   ├── ui/             # Design System OSIA (Italiana / Jost, tokens)
│   ├── assets/         # Pipeline de assets 3D (GLTF/KTX2/LOD)
│   └── identity/       # Pasaporte / SSO compartido (placeholder)  · Fase 1
├── infra/              # docker-compose de dev, IaC, deploy
├── docs/               # Paquete de diseño completo (empieza por docs/README.md)
└── brand/              # Marca OSIA (logos, fuentes, manual)
```

## Convenciones

- **Ramas:** `<tipo>/<contexto>-<descripción>` (p. ej. `feat/world-server-tick`).
- **Commits:** Conventional Commits en es-CO (p. ej. `feat(world-server): tick fijo a 20 Hz`).
- **Paquetes internos:** `@osia/<nombre>`.
- Ver el lenguaje de dominio y convenciones en [`docs/11-glosario-dominio.md`](./docs/11-glosario-dominio.md).
