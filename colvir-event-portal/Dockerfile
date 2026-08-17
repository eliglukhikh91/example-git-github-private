# syntax=docker/dockerfile:1

# ---------- Сборка ----------
FROM node:22-bookworm-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# Оставляем только production-зависимости для финального образа
RUN npm prune --omit=dev

# ---------- Runtime ----------
FROM node:22-bookworm-slim AS runtime

ENV NODE_ENV=production

WORKDIR /app

# Приложение работает от непривилегированного пользователя
RUN groupadd --system --gid 1001 colvir \
 && useradd --system --uid 1001 --gid colvir colvir

COPY --from=build --chown=colvir:colvir /app/node_modules ./node_modules
COPY --from=build --chown=colvir:colvir /app/dist ./dist
COPY --from=build --chown=colvir:colvir /app/dist-server ./dist-server
COPY --from=build --chown=colvir:colvir /app/package.json ./package.json

USER colvir

EXPOSE 3000

# Контейнер слушает только внутреннюю сеть — снаружи стоит nginx/IIS с TLS.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist-server/server.mjs"]
