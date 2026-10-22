# syntax=docker/dockerfile:1

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Solo evita que prisma.config.ts falle al generar; no se conecta a ninguna BD
ENV DATABASE_URL="postgresql://prisma:prisma@localhost:5432/prisma"
RUN npx prisma generate && npm run build

FROM node:22-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup -g 1001 -S nodejs && adduser -S api -u 1001

# --ignore-scripts: el cliente Prisma ya viaja compilado en dist/ y `prisma` es devDependency.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

COPY --from=build --chown=api:nodejs /app/dist ./dist

USER api
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s \
  CMD wget -qO- http://127.0.0.1:3000/health || exit 1

CMD ["node", "dist/src/server.js"]
