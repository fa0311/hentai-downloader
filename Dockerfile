# syntax=docker/dockerfile:1

FROM node:20-slim AS base

ENV NODE_ENV=production
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable

WORKDIR /app


FROM base AS deps

COPY package.json pnpm-lock.yaml ./

RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile

FROM base AS build

COPY --from=deps /app/node_modules /app/node_modules

COPY . .

RUN pnpm build

RUN pnpm prune --prod

FROM base AS runtime

RUN mkdir -p /output /download

COPY --from=build /app /app

USER node


CMD ["pnpm", "start"]
