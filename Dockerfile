FROM node:22-bookworm-slim AS build

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY prisma.config.ts tsconfig.json ./
COPY prisma ./prisma
COPY src ./src

# prisma generate runs from postinstall and reads DATABASE_URL.
# The real connection string is provided when the container starts.
ENV DATABASE_URL=postgresql://budget:budget@localhost:5432/budget_wallet

RUN npm ci && npm run build

FROM node:22-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY prisma.config.ts ./
COPY prisma ./prisma
COPY docker/entrypoint.sh /entrypoint.sh
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

RUN chmod +x /entrypoint.sh \
  && chown -R node:node /app

USER node

ENTRYPOINT ["/entrypoint.sh"]
