# syntax=docker/dockerfile:1

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV PRISMA_SKIP_GENERATE=1
# Only generate Prisma client if DATABASE_URL is available; skip gracefully otherwise
RUN if [ -n "$DATABASE_URL" ]; then npx prisma generate; else echo "Skipping prisma generate: DATABASE_URL not set"; fi && npm run build

FROM node:22-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup -g 1001 -S nodejs && adduser -S api -u 1001

# --ignore-scripts: evita que `prisma generate` corra en postinstall
# Copiamos el directorio prisma desde build para que este disponible si es necesario
COPY --from=build --chown=api:nodejs /app/prisma ./prisma

COPY package.json package-lock.json ./
ENV PRISMA_SKIP_GENERATE=1
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

COPY --from=build --chown=api:nodejs /app/dist ./dist

USER api
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s \
  CMD wget -qO- http://127.0.0.1:3000/health || exit 1

CMD ["node", "dist/src/server.js"]
