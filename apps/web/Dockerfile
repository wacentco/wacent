FROM node:20-alpine
RUN npm install -g pnpm@9.15.9
WORKDIR /app
COPY pnpm-workspace.yaml ./
COPY package.json ./
COPY pnpm-lock.yaml ./
COPY tsconfig.base.json ./
COPY packages/ ./packages/
COPY apps/web/ ./apps/web/
RUN pnpm install --filter @wacent/web...
RUN pnpm --filter @wacent/web build
EXPOSE 3000
CMD ["pnpm", "--filter", "@wacent/web", "start"]
