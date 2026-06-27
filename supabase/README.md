# `supabase/` — Datos de Identidad (S1.2)

Migraciones SQL forward-only del ecosistema OSIA (bounded contexts `identity` + `world` mínimo).
Fuente de verdad del esquema: [`docs/04-modelo-datos-er.md`](../docs/04-modelo-datos-er.md). Los enums
son espejo de [`@osia/shared` `domain/enums.ts`](../packages/shared/src/domain/enums.ts).

## Migraciones (orden de aplicación)

| Archivo | Qué hace |
|---|---|
| `20260623000001_bootstrap.sql` | Extensiones (`pgcrypto`, `citext`, `vector`) + `uuidv7()` + `set_updated_at()`. |
| `20260623000002_identity_core.sql` | `accounts`, `profiles`, `avatars`, `email_verifications`, `invitations`, `waitlist_entries` + índices + triggers `updated_at`. |
| `20260623000003_world_minimal.sql` | `worlds`, `zones`, `world_instances`, `presence_sessions` (sin `portals`/`plots`: Fase 5). |
| `20260623000004_identity_rls.sql` | RLS **deny-all** + ownership por `auth.uid()` + grants. |
| `20260623000005_auth_sync.sql` | Trigger `handle_new_auth_user` → crea cuenta + perfil + avatar al alta en `auth.users`. |
| `20260623000006_seed_world_catalog.sql` | Catálogo idempotente: 1 world `osia` (live) + zona `hub` (El Claro) + instancia abierta. |

## Convención de nombres (nota importante)

El doc 04 §13.1 propone `YYYYMMDD__NNNN_<contexto>_<desc>.sql`, **pero ese formato rompe el parser
de versiones del Supabase CLI** (tomaría `20260623` como versión para todas → colisión). Se usa el
formato **nativo del CLI** `YYYYMMDDHHMMSS_<desc>.sql` (mismo espíritu fecha + secuencia, con la
secuencia codificada en la parte de hora: `…000001`, `…000002`, …). Forward-only, nunca editar una
migración ya aplicada.

## Aplicar (MÉTODO DEL REPO — vinculante)

El Supabase CLI ya es **devDependency** (`pnpm exec supabase`). Las migraciones se aplican al
**proyecto cloud** apuntando DIRECTO a la base por su connection string — **sin `supabase link`**,
sin Docker. (Así es como se aplicaron todas; no hay un hook que las corra solo.)

1. La conexión directa vive en `supabase/.env.local` (gitignored, compartido con apps/api), con el
   password **percent-encoded** (`$`=`%24`, etc.):
   ```
   SUPABASE_DB_URL="postgresql://postgres:<password>@db.<REF>.supabase.co:5432/postgres"
   ```
2. **Dry-run** (no toca nada — muestra qué se aplicaría):
   ```bash
   DBURL=$(grep -E '^SUPABASE_DB_URL=' supabase/.env.local | sed -E 's/^SUPABASE_DB_URL=//; s/^"//; s/"$//')
   pnpm exec supabase db push --db-url "$DBURL" --dry-run
   ```
3. **Aplicar**:
   ```bash
   pnpm exec supabase db push --db-url "$DBURL" --yes
   ```

`db push` aplica SOLO las migraciones pendientes y las registra en
`supabase_migrations.schema_migrations`. Forward-only (nunca editar una ya aplicada). El warning
«failed to cache migrations catalog … docker» es **inofensivo** (es un caché local de pg-delta que
necesita Docker; el push sí se aplica). Alternativa con Docker local: `supabase start` + `supabase db reset`.

`vector` (pgvector) lo trae Supabase de fábrica. Se habilita ya (lo usa la memoria IA de Fase 2)
para no migrar extensiones después.

## Exposición y seguridad

- Los schemas `identity`/`world` **no se exponen por PostgREST** (config del proyecto: `Exposed
  schemas` deja solo `public`/`graphql_public`). El cliente toca identidad **vía `apps/api`** con
  `service_role` (que hace `BYPASSRLS`). La RLS es defensa en profundidad (docs/09), no la única línea.
- `email_verifications`, `waitlist_entries`, `world_instances`, `presence_sessions` son **service-only**
  (RLS habilitada, sin grants a `authenticated`).

## Validación local realizada (S1.2)

Las 6 migraciones se validaron contra un Postgres real con un **stub del entorno Supabase**
(`schema auth` + `auth.users` + `auth.uid()` por GUC) en una **base desechable**, verificando:
trigger crea cuenta+perfil+avatar con handle válido (`^[a-z0-9_]{3,20}$`), sync de `email_verified`,
accent champán por defecto, seed idempotente (re-aplicado sin duplicar), RLS habilitada en las 10
tablas, ownership (un usuario no ve un perfil privado ajeno) y `service_role` con bypass.

> El bootstrap se validó **sin** `CREATE EXTENSION vector` (pgvector no está en un Postgres plano;
> Supabase cloud sí lo tiene). El resto se aplicó tal cual.
