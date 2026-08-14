# Multi-stage build: install + build in one layer, run from a lean final image.
FROM node:20-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:20-slim
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/dist ./dist
COPY --from=build /app/package*.json ./
RUN npm install --omit=dev
# Cloud Run sets PORT automatically; server.ts already reads it.
EXPOSE 8080
CMD ["node", "dist/server.cjs"]
