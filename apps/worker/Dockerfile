FROM node:20-alpine
RUN apk add --no-cache git
RUN npm install -g pnpm@9.15.9
WORKDIR /app
COPY pnpm-workspace.yaml ./
COPY package.json ./
COPY pnpm-lock.yaml ./
COPY tsconfig.base.json ./
COPY packages/ ./packages/
COPY apps/worker/ ./apps/worker/
RUN pnpm install
RUN pnpm --filter @wacent/db build
RUN pnpm --filter @wacent/types build
RUN pnpm --filter @wacent/queue build
RUN pnpm --filter @wacent/worker build
EXPOSE 3001
CMD ["pnpm", "--filter", "@wacent/worker", "start"]
