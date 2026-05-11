# Installing CodeMyShop — multi-tenant (agency / hoster)

This guide is for agencies, sovereign hosters, and franchise networks who want to host **N independent e-commerce sites** on shared infrastructure with **one shared codebase**.

If you only want **one** shop, use the standard [INSTALL.md](INSTALL.md) instead. Multi-tenant adds operational complexity that is only worth it past 3-5 clients.

> **Why this design over a single shared database with `tenant_id` columns?** See [ARCHITECTURE.md § Multi-tenancy](ARCHITECTURE.md#multi-tenancy). TL;DR: physical DB isolation eliminates the entire class of cross-tenant bugs, simplifies GDPR compliance per tenant, and lets a tenant migrate to its own VPS later without a schema rewrite.

## Table of contents

1. [Prerequisites](#prerequisites)
2. [Repository layout for multi-tenant](#repository-layout-for-multi-tenant)
3. [Onboarding a new tenant (30-min recipe)](#onboarding-a-new-tenant-30-min-recipe)
4. [PM2 vs Docker Compose for production](#pm2-vs-docker-compose-for-production)
5. [TLS per tenant (certbot)](#tls-per-tenant-certbot)
6. [Backups per tenant](#backups-per-tenant)
7. [Scaling: when to split tenants across hosts](#scaling-when-to-split-tenants-across-hosts)
8. [Common pitfalls (collected from real deployments)](#common-pitfalls-collected-from-real-deployments)
9. [FAQ](#faq)

---

## Prerequisites

- A VPS sized for your tenant count: rough sizing is **2 vCPU + 2 GB RAM per active tenant** (storefront load) plus **4 GB shared overhead**. Eight tenants → ≥ 16 vCPU / 20 GB RAM.
- **Docker 25+** and **Docker Compose v2** *(or)* **Node.js 22+** with **PostgreSQL 17+** (`pgvector`) and **Redis 7+** managed independently
- **nginx** with **certbot** (Let's Encrypt) for TLS termination per host
- One **DNS A record per tenant** pointing to your VPS IP
- Optional: **Ansible** for automated VPS provisioning
- Optional: **PM2** for process management (recommended over `docker compose up` for production multi-tenant)

## Repository layout for multi-tenant

```
codemyshop/
├── core/                       ← shared codebase, never modified per tenant
├── examples/
│   ├── minimal-tenant/         ← template for a new tenant
│   └── multi-tenant/           ← working two-tenant Docker Compose example
├── clients/                    ← YOUR tenant packs (one dir per client)
│   ├── acme/
│   │   ├── nuxt.config.ts      ← extends: ['../../core']
│   │   ├── package.json
│   │   ├── pages/              ← optional homepage / about override
│   │   ├── components/         ← optional component overrides
│   │   ├── assets/theme-vars.css
│   │   ├── seed.yaml           ← theme + header + footer + categories
│   │   └── .env                ← gitignored: PG creds, secrets, port
│   ├── monaco/
│   │   └── …
│   └── paris/
│       └── …
├── bin/
│   └── init-tenant.sh          ← bootstrap a new tenant pack
├── docker-compose.yml          ← single-tenant template (don't use for multi)
└── package.json
```

The convention is: **one directory per tenant under `clients/`**, each is a self-contained Nuxt sub-project that extends `core/`.

`clients/*/.env` is gitignored — secrets stay out of git. `clients/*/seed.yaml` is committed (it's content config, not a secret).

## Onboarding a new tenant (30-min recipe)

### 1. Bootstrap the tenant pack (~30 seconds)

```bash
./bin/init-tenant.sh acme \
    --brand "Acme Shop" \
    --domain acme.com \
    --vertical general
```

This creates `clients/acme/` from the `minimal-tenant` template, substitutes the brand/domain/vertical in `nuxt.config.ts`, and generates a random `HUB_SESSION_SECRET` in `.env`. See [`bin/init-tenant.sh`](bin/init-tenant.sh) for all flags (`--copy-from`, `--port`, `--db-name`, …).

### 2. Provision the tenant database (~30 seconds)

One PostgreSQL container per tenant. Pick a unique port (typically 5433 + tenant index):

```bash
ACME_PG_PASSWORD=$(openssl rand -hex 32)
docker run -d \
    --name acme_postgres \
    --restart unless-stopped \
    -p 127.0.0.1:5433:5432 \
    -e POSTGRES_DB=acme \
    -e POSTGRES_USER=acme \
    -e POSTGRES_PASSWORD="$ACME_PG_PASSWORD" \
    -v acme_pg_data:/var/lib/postgresql/data \
    pgvector/pgvector:pg16
```

Save `$ACME_PG_PASSWORD` into a password manager **and** into `clients/acme/.env`:

```bash
sed -i "s|PG_PASSWORD=.*|PG_PASSWORD=$ACME_PG_PASSWORD|" clients/acme/.env
```

### 3. Apply migrations + seed (~2 minutes)

The migration is generated from `core/server/db/schema-pg/*.ts` and is identical for every tenant.

```bash
DATABASE_URL="postgres://acme:${ACME_PG_PASSWORD}@127.0.0.1:5433/acme" \
PG_SCHEMA=acme \
npm run db:migrate

# Seed theme/header/footer/categories from clients/acme/seed.yaml
# + create the first admin
npm run seed:tenant -- acme --reset \
    --with-admin admin@acme.com 'temp-pass-change-on-first-login'
```

`--reset` truncates and re-inserts (idempotent — safe to re-run).

### 4. Build and start the tenant's Nuxt process (~3 minutes for first build)

```bash
cd clients/acme
npm install
npm run build

# Run with PM2 (recommended for production)
PORT=3001 pm2 start npm --name "acme-nuxt" -- run preview
pm2 save
```

Or with the bare Node target (works for testing):

```bash
PORT=3001 node .output/server/index.mjs
```

### 5. nginx vhost + TLS (~5 minutes)

```nginx
# /etc/nginx/sites-available/acme.conf
server {
    listen 80;
    server_name acme.com www.acme.com;

    proxy_set_header Host              $host;
    proxy_set_header X-Real-IP         $remote_addr;
    proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_read_timeout 60s;
    }
}
```

```bash
sudo ln -sf /etc/nginx/sites-available/acme.conf /etc/nginx/sites-enabled/acme.conf
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d acme.com -d www.acme.com    # TLS in 60 seconds
```

### 6. Smoke-test

```bash
curl -I https://acme.com/                   # 200 + cookie
curl -I https://acme.com/api/health         # 200 OK from Nitro health route
curl -I https://acme.com/hub                # 302 → /hub/login (auth-gated)
```

If all three pass, the tenant is live. Total elapsed time: **~30 minutes** (most of it waiting for the Nuxt build).

To onboard tenant N+1, repeat steps 1-6 with a new client-id, port, and DNS record.

## PM2 vs Docker Compose for production

For multi-tenant, **PM2 is generally simpler than `docker compose up`** because:

- One PM2 daemon manages all tenant Nuxt processes — `pm2 list` shows everything.
- `pm2 reload acme-nuxt --update-env` does a **graceful** zero-downtime restart per tenant.
- Logs aggregated per process, easy `pm2 logs acme-nuxt` for one tenant.
- Resource limits per tenant (`max_memory_restart`).
- Built-in startup-on-boot via `pm2 startup`.

PostgreSQL stays in Docker (one container per tenant). Redis can be shared or per-tenant depending on your SLA.

A working `ecosystem.config.cjs` template:

```js
// /opt/codemyshop/ecosystem.config.cjs
module.exports = {
  apps: [
    {
      name: 'acme-nuxt',
      script: './clients/acme/.output/server/index.mjs',
      env: { PORT: 3001, NODE_ENV: 'production' },
      env_file: './clients/acme/.env',
      max_memory_restart: '600M',
    },
    {
      name: 'monaco-nuxt',
      script: './clients/monaco/.output/server/index.mjs',
      env: { PORT: 3002, NODE_ENV: 'production' },
      env_file: './clients/monaco/.env',
      max_memory_restart: '600M',
    },
    // …one block per tenant
  ],
}
```

```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup    # follow the printed command
```

If you prefer Docker Compose, the [`examples/multi-tenant/docker-compose.yml`](examples/multi-tenant/docker-compose.yml) shows the layout. Caveat: each `docker compose up` rebuilds **all** tenant images sequentially, which is slow at 10+ tenants.

## TLS per tenant (certbot)

One certificate per domain, automated renewal:

```bash
sudo certbot --nginx -d acme.com -d www.acme.com
sudo certbot --nginx -d monaco-skate.com -d www.monaco-skate.com
sudo certbot --nginx -d paris-vape.com -d www.paris-vape.com

# Auto-renewal is set up by the package; verify:
sudo certbot renew --dry-run
```

Each renewal runs in isolation per cert; no cross-tenant blast radius if one renewal fails (only that one tenant goes back to HTTP until you fix it).

## Backups per tenant

The cardinal rule of multi-tenant: **backups are per-tenant, never bundled**. A bundled backup is a single point of failure for every client.

A minimal backup script (cron daily at 02:30):

```bash
#!/usr/bin/env bash
# /usr/local/bin/backup-tenants.sh
set -euo pipefail

BACKUP_DIR=/var/backups/codemyshop
DATE=$(date +%Y%m%d-%H%M%S)
mkdir -p "$BACKUP_DIR"

for tenant in acme monaco paris; do
    docker exec "${tenant}_postgres" \
        pg_dump -U "$tenant" -d "$tenant" --no-owner --clean \
        | gzip > "$BACKUP_DIR/${tenant}-${DATE}.sql.gz"
done

# Optional: ship to off-site object storage (Scaleway / OVH / Hetzner S3)
# rclone copy "$BACKUP_DIR" s3:my-codemyshop-backups/

# Retention: keep 14 daily, 8 weekly, 12 monthly per tenant
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +14 -delete
```

Restore one tenant without touching the others:

```bash
gunzip -c /var/backups/codemyshop/acme-20260510.sql.gz | \
    docker exec -i acme_postgres psql -U acme -d acme
```

## Scaling: when to split tenants across hosts

Single VPS rule of thumb:

| Active tenants | VPS sizing (rough) | Notes |
|---|---|---|
| 1-5  | 4 vCPU / 8 GB | Dev/staging works on smaller, but 8 GB gives headroom for builds |
| 5-15 | 8 vCPU / 16 GB | Comfortable for typical PME traffic per tenant |
| 15-30 | 16 vCPU / 32 GB | Start watching `pm2 monit` for memory pressure |
| 30+ | Multi-VPS, route by tenant DNS or central proxy | See below |

To split across hosts: assign tenants to specific hosts via DNS. nginx on `host-A` only knows about tenants A1-A20, `host-B` about B1-B20. The `core/` codebase stays one git repo, deployed (e.g. via Ansible) to all hosts.

For >100 tenants, consider Kubernetes — the same container-per-tenant pattern works on Kubernetes with one Helm release per tenant. CodeMyShop's k8s recipe is on the roadmap.

## Common pitfalls (collected from real deployments)

| Pitfall | Symptom | Fix |
|---|---|---|
| Two parallel `nuxt build` on same tenant | `ERR_MODULE_NOT_FOUND` 500 loop | Lock file `/tmp/deploy-<tenant>.lock` in your deploy script |
| Forgetting `pm2 reload --update-env` after editing `.env` | New env vars not picked up by Nuxt | Always `--update-env`; consider scripting it in your deploy step |
| `HUB_SESSION_SECRET` < 32 chars | `/hub/login` 500s with crypto error | Use `openssl rand -hex 32` (init-tenant.sh does this for you) |
| Sharing `HUB_SESSION_SECRET` across tenants | A user logged into tenant A can forge a session for tenant B | One unique secret per tenant — never reuse |
| Forgetting to apply migrations after `core/` schema change | New columns missing in tenant DB → SELECT errors | After every `core/` schema bump, run `npm run db:migrate` against **every** tenant DB |
| `psql -f migration.sql` without `ON_ERROR_STOP=1` | Migration partially applied, exit code 0 → silent corruption | Always `psql -v ON_ERROR_STOP=1 -f` |
| Using `git add .` in your deploy script | Accidentally commit `clients/*/.env` containing PG passwords | List files explicitly; `.gitignore` `clients/*/.env` |
| Single Redis with `requirepass` shared across tenants | A bug in tenant A's session code can read tenant B's sessions | Use Redis databases (`SELECT 1`, `SELECT 2`, …) or one Redis container per tenant |

## FAQ

### Can I use a managed Postgres (Scaleway DBaaS, OVH, RDS)?

Yes. Provision one managed database **per tenant** (one DB instance, not one schema). Set `DATABASE_URL=postgres://acme:pass@managed-host/acme` in `clients/acme/.env`. The container-per-tenant model becomes "managed-DB-per-tenant" — same isolation properties.

### How do I do "live" copy of a tenant for staging?

```bash
# Dump prod tenant
docker exec acme_postgres pg_dump -U acme -d acme | \
    docker exec -i acme_staging_postgres psql -U acme -d acme

# Update clients/acme-staging/.env with staging DB host/port
# Build and run on a different port
```

The staging tenant can run side-by-side on the same host, on a different port, with its own DB. Useful for "let me show the client a preview before I deploy".

### Can a tenant be migrated to its own dedicated VPS later?

Yes — that's the **portability promise** of container-per-tenant. Procedure:

```bash
# 1. On the source host: dump the tenant DB + tar the .env
docker exec acme_postgres pg_dump -U acme -d acme > acme.sql
tar -czf acme.tar.gz clients/acme/.env

# 2. On the destination host (fresh VPS):
# Provision Postgres + Nuxt as in steps 2-4 above.
docker exec -i acme_postgres psql -U acme -d acme < acme.sql

# 3. Update DNS to point acme.com → new VPS IP, wait for propagation.

# 4. Decommission the tenant on the source host.
```

You can sell this as "every Managed plan is portable: if you ever want to take your shop in-house, we hand you the container and you're independent in 30 minutes."

### What's the recommended monitoring setup?

- **Per-tenant uptime check** (Better Uptime / UptimeRobot / self-hosted Uptime Kuma) hitting `/api/health` on each tenant's domain.
- **Process metrics**: `pm2-prometheus-exporter` aggregates all tenant processes for Prometheus.
- **Postgres metrics**: `postgres_exporter` per container.
- **Logs**: `loki` with one label per tenant (`{tenant="acme"}`).

A starter Grafana dashboard JSON is on the roadmap.

### Where do I report bugs or ask questions?

- [GitHub Discussions](https://github.com/codemyshop/codemyshop/discussions) — for "how do I…" questions
- [GitHub Issues](https://github.com/codemyshop/codemyshop/issues/new/choose) — for bugs (templates provided)
- Security: see [SECURITY.md](SECURITY.md), do **not** open a public issue
