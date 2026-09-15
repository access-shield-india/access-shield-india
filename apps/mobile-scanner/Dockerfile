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

RUN pnpm --filter @accessshield/types build && \
	pnpm --filter @accessshield/db build && \
	pnpm --filter @accessshield/mobile-scanner build

# Production image
FROM node:20-bookworm-slim AS runner
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    openjdk-17-jre-headless \
    unzip \
    wget \
    && rm -rf /var/lib/apt/lists/*

ENV ANDROID_SDK_ROOT=/opt/android-sdk
ENV ANDROID_HOME=/opt/android-sdk
ENV PATH=$ANDROID_SDK_ROOT/cmdline-tools/latest/bin:$ANDROID_SDK_ROOT/platform-tools:$ANDROID_SDK_ROOT/emulator:$PATH

RUN mkdir -p "$ANDROID_SDK_ROOT/cmdline-tools" \
    && wget -q https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip -O /tmp/cmdline-tools.zip \
    && unzip -q /tmp/cmdline-tools.zip -d "$ANDROID_SDK_ROOT/cmdline-tools" \
    && mv "$ANDROID_SDK_ROOT/cmdline-tools/cmdline-tools" "$ANDROID_SDK_ROOT/cmdline-tools/latest" \
    && rm /tmp/cmdline-tools.zip \
    && yes | sdkmanager --licenses >/dev/null \
    && sdkmanager "platform-tools" "platforms;android-35" "build-tools;35.0.0"

WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 scanner

COPY --from=builder /app/apps/mobile-scanner/dist ./apps/mobile-scanner/dist
COPY --from=builder /app/apps/mobile-scanner/node_modules ./apps/mobile-scanner/node_modules
COPY --from=builder /app/apps/mobile-scanner/package.json ./apps/mobile-scanner/
COPY --from=builder /app/packages/db/dist ./packages/db/dist
COPY --from=builder /app/packages/db/node_modules ./packages/db/node_modules
COPY --from=builder /app/packages/db/package.json ./packages/db/
COPY --from=builder /app/packages/types/dist ./packages/types/dist
COPY --from=builder /app/packages/types/node_modules ./packages/types/node_modules
COPY --from=builder /app/packages/types/package.json ./packages/types/
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

USER scanner

CMD ["node", "apps/mobile-scanner/dist/index.js"]
