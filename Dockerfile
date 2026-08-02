# =============================================================================
# Dockerfile for the Google SERP Explorer (INIZIO practical test)
# =============================================================================
# Multi-stage build that produces a minimal, production-ready image running
# the Next.js standalone server. Works for local development via
# docker-compose.yml as well as for deployment to Render / Railway / Fly.
# =============================================================================

# ---- Stage 1: deps -----------------------------------------------------------
FROM node:20-alpine AS deps
WORKDIR /app

# Bun is used as the package manager / runtime in this project. Install it.
RUN npm install -g bun

# Copy only manifests so this layer is cached unless deps change.
COPY package.json bun.lock* ./

# Install production + dev dependencies (we need devDeps for the test stage).
RUN bun install --frozen-lockfile

# ---- Stage 2: build ----------------------------------------------------------
FROM node:20-alpine AS builder
WORKDIR /app
RUN npm install -g bun

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Disable telemetry during the build for reproducibility.
ENV NEXT_TELEMETRY_DISABLED=1

# Build the standalone Next.js production bundle.
RUN bun run build

# ---- Stage 3: test (optional, used by `docker compose run test`) -------------
FROM node:20-alpine AS test
WORKDIR /app
RUN npm install -g bun

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Run Jest unit tests. Fails the build if any test fails.
CMD ["bun", "run", "test"]

# ---- Stage 4: runtime --------------------------------------------------------
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Run as a non-root user for security.
RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

# Copy the standalone server output produced by `next build`.
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

USER nextjs

EXPOSE 3000

# Simple healthcheck hitting the /api/health endpoint.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1

CMD ["node", "server.js"]
