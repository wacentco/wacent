FROM node:20-alpine
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
RUN npm install -g pnpm@9.15.9
WORKDIR /app
COPY pnpm-workspace.yaml ./
COPY package.json ./
COPY pnpm-lock.yaml ./
COPY tsconfig.base.json ./
COPY packages/ ./packages/
COPY apps/web/ ./apps/web/
RUN pnpm install
RUN pnpm --filter @wacent/db build
RUN pnpm --filter @wacent/types build
RUN pnpm --filter @wacent/queue build
RUN pnpm --filter @wacent/web build
EXPOSE 3000
CMD ["pnpm", "--filter", "@wacent/web", "start"]
