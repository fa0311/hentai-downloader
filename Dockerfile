FROM node:24 AS builder
WORKDIR /app
RUN npm install -g pnpm@10.15.0

RUN apt-get update
RUN apt-get install -y python3 make g++
RUN rm -rf /var/lib/apt/lists/*

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build
RUN pnpm rebuild roaring
RUN pnpm prune --prod

FROM node:24 AS runtime
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
COPY bin ./bin
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist


FROM runtime AS cli
ENTRYPOINT ["node", "./bin/run.js"]
CMD ["help"]

FROM runtime AS scheduler
ENTRYPOINT ["node", "./bin/run.js", "schedule"]
CMD ["schedule.json"]

ENV HEARTBEAT_PATH=heartbeat.epoch
ENV LAST_SUCCESS_PATH=last_success.epoch

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD ["node", "./bin/healthcheck.js"]