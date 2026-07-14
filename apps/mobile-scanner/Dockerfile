# AccessShield Mobile Scanner Dockerfile
# Multi-stage build for optimized production image

FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/config/package.json ./packages/config/
COPY packages/db/package.json ./packages/db/
COPY packages/types/package.json ./packages/types/
COPY apps/mobile-scanner/package.json ./apps/mobile-scanner/

RUN pnpm install --frozen-lockfile

# Build the application
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/config/node_modules ./packages/config/node_modules
COPY --from=deps /app/packages/db/node_modules ./packages/db/node_modules
COPY --from=deps /app/packages/types/node_modules ./packages/types/node_modules
COPY --from=deps /app/apps/mobile-scanner/node_modules ./apps/mobile-scanner/node_modules

COPY package.json pnpm-workspace.yaml ./
COPY packages/config ./packages/config
COPY packages/db ./packages/db
COPY packages/types ./packages/types
COPY apps/mobile-scanner ./apps/mobile-scanner
COPY turbo.json ./

RUN pnpm --filter @accessshield/mobile-scanner build

# Production image
FROM node:20-alpine AS runner
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 scanner

COPY --from=builder /app/apps/mobile-scanner/dist ./apps/mobile-scanner/dist
COPY --from=builder /app/apps/mobile-scanner/package.json ./apps/mobile-scanner/
COPY --from=builder /app/packages/db/dist ./packages/db/dist
COPY --from=builder /app/packages/db/package.json ./packages/db/
COPY --from=builder /app/packages/types/dist ./packages/types/dist
COPY --from=builder /app/packages/types/package.json ./packages/types/
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

USER scanner

CMD ["node", "apps/mobile-scanner/dist/index.js"]
