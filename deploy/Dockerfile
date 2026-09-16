# syntax=docker/dockerfile:1
#
# Diadem container image.
# Build context is the repository root:  docker build -f deploy/Dockerfile .

# ---------- build ----------
FROM node:22-alpine AS builder

# bash for setup.sh; pnpm pinned rather than @latest so builds are reproducible
RUN apk add --no-cache bash && npm install -g pnpm@10 --no-fund --no-audit

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
COPY patches ./patches
RUN pnpm install --frozen-lockfile

COPY . .

# Creates config/config.toml from the example and hard-links it into src/.
RUN chmod +x setup.sh && ./setup.sh

RUN pnpm build

# Migrations are COMMITTED, not generated here. Generating per build gives each
# image a fresh journal timestamp, and drizzle re-applies anything newer than
# the last recorded migration - so a rebuild would try to CREATE TABLE over an
# existing schema. Regenerate deliberately with `pnpm drizzle-kit generate`
# and commit the result.
RUN test -f /app/drizzle/meta/_journal.json || (echo "ERROR: drizzle/ missing from the build context" && exit 1)

# ---------- runtime ----------
FROM node:22-alpine AS runner

RUN npm install -g pnpm@10 --no-fund --no-audit

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
COPY patches ./patches
RUN pnpm install --prod --frozen-lockfile

# smol-toml parses AND serialises, which the env overlay needs. The `toml`
# package already in dependencies is parse-only.
RUN pnpm add smol-toml

COPY --from=builder /app/build ./build
COPY --from=builder /app/static ./static
COPY --from=builder /app/config/config.example.toml ./config/config.example.toml
COPY --from=builder /app/drizzle ./drizzle
COPY deploy/apply-env.mjs deploy/migrate.mjs ./deploy/
COPY deploy/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0 \
    DIADEM_AUTO_MIGRATE=true

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/" >/dev/null 2>&1 || exit 1

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["node", "build/index.js"]
