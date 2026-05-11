# syntax=docker/dockerfile:1.7

# CodeMyShop — production image.
# Multi-stage Alpine build: build the minimal-tenant example with the
# musl-aware sharp prebuilds, then ship the Nitro `.output` on a tiny
# Alpine runtime. No system libvips needed — sharp 0.34+ vendors its
# own libvips-cpp.so under @img/sharp-libvips-linuxmusl-x64.
#
# Result: ~150 MB image (vs 446 MB on bookworm-slim with system libvips).

# ──────────────────────────────────────────────────────────────────────
# Stage 1 — build
# ──────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

# Build deps for any native modules that fall back to source build.
# Sharp is shipped with prebuilds for linuxmusl-x64 so doesn't need them,
# but other packages (bcrypt, sqlite3, etc.) might.
RUN apk add --no-cache python3 make g++ pkgconfig ca-certificates

WORKDIR /app

# Workspace manifests first — leverages Docker layer cache when sources
# change but dependencies do not.
COPY package.json package-lock.json ./
COPY core/package.json ./core/
COPY examples/minimal-tenant/package.json ./examples/minimal-tenant/

RUN npm ci --no-audit --no-fund

# Now copy the rest of the source tree.
COPY . .

# Build the example tenant — this produces `examples/minimal-tenant/.output`
# which is what the runtime stage actually serves.
RUN npm run build

# ──────────────────────────────────────────────────────────────────────
# Stage 2 — runtime
# ──────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS runtime

# Runtime needs only tini (PID 1 for clean shutdowns) and ca-certificates
# for outbound TLS. Sharp's native libs ship inside .output/server/node_modules.
RUN apk add --no-cache tini ca-certificates && \
    addgroup -S codemyshop && \
    adduser -S -G codemyshop -h /app -s /sbin/nologin codemyshop

WORKDIR /app

# Copy the built Nitro output. `.output/server/node_modules/` is self-contained
# (Nitro externalizes deps and copies them in, including @img/sharp-libvips-*).
COPY --from=builder --chown=codemyshop:codemyshop /app/examples/minimal-tenant/.output ./.output

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000 \
    NITRO_PORT=3000

USER codemyshop
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:3000/api/health', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", ".output/server/index.mjs"]
