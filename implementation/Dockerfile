# V1 read-only HTTP API — local container image.
#
# ⚠️ LOCAL RUN ONLY, NOT A PRODUCTION IMAGE. There is no approved deploy
# infrastructure: no public HTTPS termination, no secret manager, no
# monitoring, no network access control. This image exists so both apps can be
# brought up on this machine, exactly as authorized — nothing here should be
# exposed publicly. The same warning is in the header of http/read-api.ts.
#
# No new dependency is introduced: the server is node:http from the standard
# library, and this is the official Node slim base image.

# ---------- stage 1: build ----------
FROM node:20-slim AS build
WORKDIR /app

# Prisma's schema engine needs OpenSSL, which node:*-slim does not ship. Without
# it, `prisma migrate deploy` fails with a schema-engine error (observed, not
# assumed - the first build failed exactly this way).
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl ca-certificates     && rm -rf /var/lib/apt/lists/*

# Install with dev dependencies present — tsc and prisma generate both need them.
COPY package.json package-lock.json ./
RUN npm ci

# Prisma client must be generated before tsc, since the compiled code imports
# the generated types.
COPY prisma ./prisma
RUN npx prisma generate

COPY tsconfig.json ./
COPY shared-contracts ./shared-contracts
COPY foundation ./foundation
COPY feed ./feed
COPY briefing ./briefing
COPY value-engines ./value-engines
COPY composition ./composition
COPY http ./http
RUN npm run build

# ---------- stage 2: runtime ----------
FROM node:20-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Same OpenSSL requirement at runtime: the generated Prisma client needs it to
# open a connection, not only the migration engine.
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl ca-certificates     && rm -rf /var/lib/apt/lists/*

# Production dependencies only — no tsc, no jest, no test tooling in the image.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# The generated Prisma client and the schema are both needed at runtime:
# the client to talk to Postgres, the schema for `prisma migrate deploy`.
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma
COPY prisma ./prisma
COPY --from=build /app/dist ./dist

# Run as the image's built-in unprivileged user rather than root.
USER node

EXPOSE 3000
CMD ["node", "dist/http/server.js"]
