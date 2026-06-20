# Imagen del world-server (OSIA). Build DESDE LA RAÍZ del repo:
#   docker build -f apps/world-server/Dockerfile -t osia-world .
# (el compose de producción ya lo hace con context: ..)
FROM node:20-slim
RUN corepack enable
WORKDIR /app

# Copiamos todo el monorepo (el .dockerignore excluye node_modules/.next/.git).
COPY . .

# Instala SOLO el world-server y sus dependencias (incluye @osia/shared).
# OJO: el install corre ANTES de fijar NODE_ENV=production para que tsx (devDep) se instale.
RUN pnpm install --frozen-lockfile --filter "@osia/world-server..."

ENV NODE_ENV=production
EXPOSE 2567
CMD ["pnpm", "--filter", "@osia/world-server", "start"]
