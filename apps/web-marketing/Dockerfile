FROM node:20-alpine
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_CONTACT_EMAIL
ENV NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}
ENV NEXT_PUBLIC_CONTACT_EMAIL=${NEXT_PUBLIC_CONTACT_EMAIL}
RUN npm install -g pnpm@9.15.9
WORKDIR /app
COPY pnpm-workspace.yaml ./
COPY package.json ./
COPY pnpm-lock.yaml ./
COPY tsconfig.base.json ./
COPY apps/web-marketing/ ./apps/web-marketing/
RUN pnpm install --filter @wacent/web-marketing...
RUN pnpm --filter @wacent/web-marketing build
EXPOSE 3002
CMD ["pnpm", "--filter", "@wacent/web-marketing", "start"]
