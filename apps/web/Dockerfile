# syntax=docker/dockerfile:1.7

FROM node:20-bookworm-slim AS base
WORKDIR /repo
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/web/package.json apps/web/package.json
COPY apps/api/package.json apps/api/package.json
COPY apps/ai-service/package.json apps/ai-service/package.json
COPY packages/config/package.json packages/config/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/types/package.json packages/types/package.json
COPY packages/ui/package.json packages/ui/package.json
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
ARG NEXT_PUBLIC_AUTH_URL=https://auth.accessiblenow.in
ARG NEXT_PUBLIC_AUTH_CLIENT_ID=accessshield-web
ARG AUTH_ISSUER_URL=https://auth.accessiblenow.in/realms/accessshield
ARG NEXTAUTH_URL=https://accessiblenow.in
ARG NEXT_PUBLIC_APP_URL=https://accessiblenow.in
ARG NEXT_PUBLIC_CDN_URL=https://accessiblenow.in
ENV API_URL=http://accessshield-api:4000
ENV NEXT_PUBLIC_API_URL=
ENV NEXT_PUBLIC_AUTH_URL=$NEXT_PUBLIC_AUTH_URL
ENV NEXT_PUBLIC_AUTH_CLIENT_ID=$NEXT_PUBLIC_AUTH_CLIENT_ID
ENV AUTH_ISSUER_URL=$AUTH_ISSUER_URL
ENV NEXTAUTH_URL=$NEXTAUTH_URL
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_CDN_URL=$NEXT_PUBLIC_CDN_URL
RUN pnpm --filter @accessshield/types build && \
	pnpm --filter @accessshield/db build && \
	pnpm --filter @accessshield/ui build && \
	pnpm --filter @accessshield/web build

FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

RUN useradd --uid 1001 --create-home --shell /bin/bash nextjs

COPY --from=build /repo/apps/web/.next/standalone ./
COPY --from=build /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /repo/apps/web/public ./apps/web/public

USER nextjs
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
