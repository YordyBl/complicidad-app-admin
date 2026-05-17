# syntax=docker/dockerfile:1
# =============================================================================
# Complicidad Frontend — Dockerfile
#
# Multi-stage build for Next.js standalone output.
#   1. deps:    Install production dependencies.
#   2. builder: Build the Next.js app (standalone output).
#   3. runtime: Minimal production image with only the standalone output.
#
# Server-side API calls use the API_BASE_URL env var.
# In Docker Compose: API_BASE_URL=http://api:3000 (service DNS).
# The frontend container exposes port 3001 by default.
# =============================================================================

# ---- Stage 1: Dependencies ----
FROM node:22-alpine AS deps

WORKDIR /app

# Install pnpm pinned to the lockfile-compatible major version.
# pnpm v10+ requires approve-builds for packages such as sharp during Docker builds.
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate

# Copy dependency manifests
COPY package.json pnpm-lock.yaml ./

# Install all dependencies (including devDeps needed for build)
RUN pnpm install --frozen-lockfile

# ---- Stage 2: Builder ----
FROM node:22-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.15.9 --activate

# Copy installed dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json /app/pnpm-lock.yaml ./

# Copy application source
COPY . .

# Build the Next.js app with standalone output
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

# ---- Stage 3: Runtime ----
FROM node:22-alpine AS runtime

WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

# Copy standalone output from builder
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Copy the actual standalone server entry (Next.js renames it)
# If using outputFileTracing, the server.js is at root of standalone
# Ensure the correct entry exists
RUN test -f server.js || (echo "standalone server.js not found" && exit 1)

USER nextjs

EXPOSE 3001

ENV NODE_ENV=production
ENV PORT=3001
ENV NEXT_TELEMETRY_DISABLED=1

# API_BASE_URL must be set at runtime:
#   docker run -e API_BASE_URL=http://api:3000 ...
# In Docker Compose, set via environment: or env_file:
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/ || exit 1

CMD ["node", "server.js"]
