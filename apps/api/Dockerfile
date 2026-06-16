FROM node:20-alpine
RUN npm install -g pnpm@9.15.9
WORKDIR /app
COPY pnpm-workspace.yaml ./
COPY package.json ./
COPY pnpm-lock.yaml ./
COPY tsconfig.base.json ./
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/
RUN pnpm install
RUN pnpm --filter @wacent/db build
RUN pnpm --filter @wacent/types build
RUN pnpm --filter @wacent/queue build
RUN pnpm --filter @wacent/api build
EXPOSE 8000
CMD ["pnpm", "--filter", "@wacent/api", "start"]
