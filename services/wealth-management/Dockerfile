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
RUN pnpm turbo build --filter=wealth-management...

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs
COPY --from=builder /app/services/wealth-management/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/services/wealth-management/package.json ./package.json
USER nestjs
EXPOSE 3005
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3005/health || exit 1
CMD ["node", "dist/main.js"]
