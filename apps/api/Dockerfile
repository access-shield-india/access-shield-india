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
RUN pnpm --filter @accessshield/types build && \
	pnpm --filter @accessshield/db build && \
	pnpm --filter @accessshield/api build

FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4000

RUN useradd --uid 1001 --create-home --shell /bin/bash nodeapp

COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/apps/api/dist ./apps/api/dist
COPY --from=build /repo/apps/api/package.json ./apps/api/package.json
COPY --from=build /repo/packages/db/dist ./packages/db/dist
COPY --from=build /repo/packages/db/package.json ./packages/db/package.json
COPY --from=build /repo/packages/types/dist ./packages/types/dist
COPY --from=build /repo/packages/types/package.json ./packages/types/package.json
COPY --from=build /repo/package.json ./package.json

USER nodeapp
EXPOSE 4000
CMD ["node", "apps/api/dist/index.js"]
