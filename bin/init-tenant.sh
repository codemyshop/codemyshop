#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════
# init-tenant.sh — Bootstrap a new CodeMyShop tenant pack from a template.
#
# Usage:
#   ./bin/init-tenant.sh <client-id> [options]
#
# Options:
#   --copy-from <template>   tenant pack to duplicate     (default: minimal-tenant)
#   --brand "Brand Name"     visible commercial name      (default: <client-id>)
#   --domain example.com     public domain                (default: <client-id>.localhost)
#   --vertical food|fashion|general                       (default: general)
#   --port 3001              Nuxt PORT for this tenant    (default: auto-incremented)
#   --pg-port 5433           Postgres host port           (default: auto-incremented)
#
# What it does:
#   1. Copy the template tenant pack to clients/<client-id>/
#   2. Substitute brand/domain/vertical/port in nuxt.config.ts
#   3. Substitute client-id/pg_db in seed.yaml (if present)
#   4. Generate a gitignored .env with random HUB_SESSION_SECRET
#
# What it does NOT do (you handle these next):
#   - Provision the tenant's PostgreSQL container (one-liner in
#     INSTALL-MULTI-TENANT.md § "Provision the tenant database")
#   - Apply schema migrations against the tenant DB
#   - Seed data from seed.yaml
#   - Configure nginx + TLS
#   - Start PM2
#
# See INSTALL-MULTI-TENANT.md for the complete onboarding recipe.
#
# License: AGPL-3.0
# ═══════════════════════════════════════════════════════════════════════════
set -euo pipefail

usage() {
  cat <<EOF
Usage: $0 <client-id> [options]

  <client-id>            kebab-case codename (e.g. 'acme', 'monaco-skate')

Options:
  --copy-from TEMPLATE   tenant pack to duplicate (default: minimal-tenant)
                         Available: any directory under examples/ or clients/
  --brand    "TEXT"      visible brand name        (default: <client-id>)
  --domain   HOST        public domain             (default: <client-id>.localhost)
  --vertical V           food | fashion | general  (default: general)
  --port     N           Nuxt PORT                 (default: 3001 if first tenant, else +1)
  --pg-port  N           Postgres host port        (default: 5433 if first tenant, else +1)
  -h, --help             Show this help.

Examples:
  $0 acme
  $0 monaco-skate --brand "Monaco Skate Co" --domain monaco-skate.com --vertical fashion
  $0 paris --copy-from monaco-skate --port 3003 --pg-port 5435
EOF
  exit 0
}

[ $# -lt 1 ] && usage
case "${1:-}" in -h|--help) usage ;; esac

CLIENT_ID="$1"
shift

# Defaults (some computed below from CLIENT_ID)
COPY_FROM="minimal-tenant"
BRAND=""
DOMAIN=""
VERTICAL="general"
PORT=""
PG_PORT=""

while [ $# -gt 0 ]; do
  case "$1" in
    --copy-from) COPY_FROM="$2"; shift 2 ;;
    --brand)     BRAND="$2"; shift 2 ;;
    --domain)    DOMAIN="$2"; shift 2 ;;
    --vertical)  VERTICAL="$2"; shift 2 ;;
    --port)      PORT="$2"; shift 2 ;;
    --pg-port)   PG_PORT="$2"; shift 2 ;;
    -h|--help)   usage ;;
    *)           echo "❌ Unknown argument: $1" >&2; usage ;;
  esac
done

# ─── Validation ──────────────────────────────────────────────────────
if ! [[ "$CLIENT_ID" =~ ^[a-z][a-z0-9-]*$ ]]; then
  echo "❌ Invalid <client-id>: '$CLIENT_ID'. Must be kebab-case (e.g. 'acme', 'monaco-skate')." >&2
  exit 1
fi
if [[ "$VERTICAL" != "food" && "$VERTICAL" != "fashion" && "$VERTICAL" != "general" ]]; then
  echo "❌ Invalid --vertical: '$VERTICAL'. Allowed: food | fashion | general." >&2
  exit 1
fi

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CLIENTS_DIR="$REPO_ROOT/clients"
mkdir -p "$CLIENTS_DIR"

# Locate template: try clients/<copy-from>, then examples/<copy-from>
SRC=""
for candidate in "$CLIENTS_DIR/$COPY_FROM" "$REPO_ROOT/examples/$COPY_FROM"; do
  if [ -d "$candidate" ]; then
    SRC="$candidate"
    break
  fi
done
if [ -z "$SRC" ]; then
  echo "❌ Template '$COPY_FROM' not found in clients/ or examples/." >&2
  exit 1
fi

DST="$CLIENTS_DIR/$CLIENT_ID"
[ -d "$DST" ] && { echo "❌ Destination already exists: $DST" >&2; exit 1; }

# Derived defaults
[ -z "$BRAND" ]  && BRAND="$CLIENT_ID"
[ -z "$DOMAIN" ] && DOMAIN="${CLIENT_ID}.localhost"
PG_DB_NAME="${CLIENT_ID//-/_}"

# Auto-increment ports based on existing tenants
TENANT_COUNT=$(find "$CLIENTS_DIR" -maxdepth 1 -mindepth 1 -type d 2>/dev/null | wc -l)
[ -z "$PORT" ]    && PORT=$((3001 + TENANT_COUNT))
[ -z "$PG_PORT" ] && PG_PORT=$((5433 + TENANT_COUNT))

cat <<EOF
🏗  Bootstrapping tenant '$CLIENT_ID' from template '$COPY_FROM'

    brand     = $BRAND
    domain    = $DOMAIN
    vertical  = $VERTICAL
    pg_db     = $PG_DB_NAME
    port      = $PORT (Nuxt)
    pg_port   = $PG_PORT (Postgres host port)

EOF

# ─── 1. Copy template ────────────────────────────────────────────────
cp -r "$SRC" "$DST"
rm -f "$DST/.env" "$DST/.env.local"  # never carry over a template's runtime env
echo "✓ clients/$CLIENT_ID/  (copied from $COPY_FROM)"

# ─── 2. Patch nuxt.config.ts ─────────────────────────────────────────
NUXT_CFG="$DST/nuxt.config.ts"
if [ -f "$NUXT_CFG" ]; then
  # The template uses placeholders or template-specific values; we substitute
  # by best-effort regex. If your template uses different keys, tweak below.
  sed -i.bak \
      -e "s|brandName: *'[^']*'|brandName: '$BRAND'|g" \
      -e "s|psFrontUrl: *'[^']*'|psFrontUrl: 'https://$DOMAIN'|g" \
      -e "s|vertical: *'[^']*'|vertical: '$VERTICAL'|g" \
      -e "s|title: *'[^']*'|title: '$BRAND'|g" \
      "$NUXT_CFG"
  rm -f "${NUXT_CFG}.bak"
  echo "✓ nuxt.config.ts  (brandName, psFrontUrl, vertical, title patched)"
fi

# ─── 3. Patch seed.yaml if present ───────────────────────────────────
SEED_YAML="$DST/seed.yaml"
if [ -f "$SEED_YAML" ]; then
  COPY_FROM_PG_DB="${COPY_FROM//-/_}"
  sed -i.bak \
      -e "s|client_id: *$COPY_FROM|client_id: $CLIENT_ID|g" \
      -e "s|pg_db: *$COPY_FROM_PG_DB|pg_db: $PG_DB_NAME|g" \
      -e "s|pg_user: *$COPY_FROM_PG_DB|pg_user: $PG_DB_NAME|g" \
      "$SEED_YAML"
  rm -f "${SEED_YAML}.bak"
  echo "✓ seed.yaml  (client_id, pg_db, pg_user patched)"
fi

# ─── 4. Generate .env with random secrets ────────────────────────────
SECRET=$(openssl rand -hex 32)
PG_PASSWORD_PLACEHOLDER="REPLACE-AFTER-CREATING-PG-CONTAINER"

cat > "$DST/.env" <<ENV
# Tenant '$CLIENT_ID' — runtime environment.
# Generated by bin/init-tenant.sh on $(date -u +%Y-%m-%dT%H:%M:%SZ).
# This file is gitignored (clients/*/.env). Never commit secrets.

PORT=$PORT
NODE_ENV=production

# ─── PostgreSQL (per-tenant container, see INSTALL-MULTI-TENANT.md) ──
PG_HOST=127.0.0.1
PG_PORT=$PG_PORT
PG_DB=$PG_DB_NAME
PG_USER=$PG_DB_NAME
PG_PASSWORD=$PG_PASSWORD_PLACEHOLDER
DATABASE_URL=postgres://$PG_DB_NAME:$PG_PASSWORD_PLACEHOLDER@127.0.0.1:$PG_PORT/$PG_DB_NAME

# ─── Nuxt session signing key ────────────────────────────────────────
HUB_SESSION_SECRET=$SECRET
NUXT_SECRET=$SECRET

# ─── Public URL ──────────────────────────────────────────────────────
NUXT_PUBLIC_PS_FRONT_URL=https://$DOMAIN

# ─── AI providers (optional) ─────────────────────────────────────────
# ANTHROPIC_API_KEY=
# OPENAI_API_KEY=
# MISTRAL_API_KEY=
ENV
chmod 600 "$DST/.env"
echo "✓ .env  (HUB_SESSION_SECRET random; PG_PASSWORD placeholder)"

cat <<EOF

📋 Next steps:

  1. Provision the tenant PostgreSQL container:

       PG_PASSWORD=\$(openssl rand -hex 32)
       docker run -d --name ${PG_DB_NAME}_postgres \\
           --restart unless-stopped \\
           -p 127.0.0.1:$PG_PORT:5432 \\
           -e POSTGRES_DB=$PG_DB_NAME \\
           -e POSTGRES_USER=$PG_DB_NAME \\
           -e POSTGRES_PASSWORD="\$PG_PASSWORD" \\
           -v ${PG_DB_NAME}_pg_data:/var/lib/postgresql/data \\
           pgvector/pgvector:pg16

  2. Update clients/$CLIENT_ID/.env with the generated PG_PASSWORD:

       sed -i "s|$PG_PASSWORD_PLACEHOLDER|\$PG_PASSWORD|g" clients/$CLIENT_ID/.env

  3. Apply schema + seed:

       cd clients/$CLIENT_ID && npm install && npm run prepare
       cd \$(git rev-parse --show-toplevel)
       PG_SCHEMA=$PG_DB_NAME npm run db:migrate
       npm run seed:tenant -- $CLIENT_ID --reset --with-admin admin@$DOMAIN

  4. Build and run:

       cd clients/$CLIENT_ID && npm run build
       PORT=$PORT pm2 start npm --name "$CLIENT_ID-nuxt" -- run preview

  5. Add nginx vhost + TLS for $DOMAIN.
     (See INSTALL-MULTI-TENANT.md § "nginx vhost + TLS")

✅ Tenant '$CLIENT_ID' bootstrapped. Ready for steps 1-5.
EOF
