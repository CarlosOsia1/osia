# Imagen de apps/api (OSIA — NestJS hexagonal). Build DESDE LA RAÍZ del repo:
#   docker build -f apps/api/Dockerfile -t osia-api .
# Corre con las envs de apps/api/src/config/env.ts (SUPABASE_*, SUPABASE_DB_URL, CORS_ORIGINS,
# WORLD_TICKET_SECRET, COOKIE_*, SESSION_*, SMTP_*, SENTRY_DSN opcional…). Ver docs/PROVISIONING.md.
FROM node:20-slim
RUN corepack enable
WORKDIR /app

# Copiamos todo el monorepo (el .dockerignore excluye node_modules/.next/.git).
COPY . .

# Instala SOLO el api y sus dependencias del workspace (incluye @osia/shared).
# El install corre ANTES de fijar NODE_ENV=production para traer las devDeps que el runtime usa
# (tsx/@swc-node para ejecutar TypeScript directo, igual que el world-server).
RUN pnpm install --frozen-lockfile --filter "@osia/api..."

ENV NODE_ENV=production
EXPOSE 4000
# `start` = node --import @swc-node/register/esm-register src/main.ts (ver apps/api/package.json).
CMD ["pnpm", "--filter", "@osia/api", "start"]
