FROM node:22-alpine AS base
RUN corepack enable
RUN apk add --no-cache libc6-compat
WORKDIR /app

FROM base AS builder
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json ./
COPY apps/ apps/
COPY services/ services/
COPY packages/ packages/
RUN pnpm install --frozen-lockfile
RUN pnpm turbo build --filter=market-feeder...

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs
COPY --from=builder /app/services/market-feeder/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/services/market-feeder/package.json ./package.json
USER nestjs
EXPOSE 3002
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3002/health || exit 1
CMD ["node", "dist/main.js"]
