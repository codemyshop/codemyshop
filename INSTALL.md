# Installing CodeMyShop

This guide covers the **Community** install (self-host). For Managed plans, see [codemyshop.com](https://codemyshop.com).

## Table of contents

1. [Prerequisites](#prerequisites)
2. [Quick start with Docker (recommended)](#quick-start-with-docker-recommended)
3. [Quick start from source](#quick-start-from-source)
4. [Environment variables](#environment-variables)
5. [First admin login](#first-admin-login)
6. [FAQ](#faq)

---

## Prerequisites

- **Docker 25+ and Docker Compose v2** (for the recommended path)
- *Or* **Node.js 22+** with **PostgreSQL 17+** (with `pgvector`) and **Redis 7+** (for the from-source path)
- A registered domain pointing to your server (production only)
- **nginx** with Let's Encrypt or any reverse proxy with TLS termination (production only)

## Quick start with Docker (recommended)

The fastest way to try CodeMyShop locally:

```bash
docker run --rm -p 3000:3000 ghcr.io/codemyshop/codemyshop:latest
# → http://localhost:3000
```

This boots a single container with an in-process SQLite-less stack — useful
for a smoke test only. For a real deployment, use the full `docker-compose.yml`:

```bash
git clone https://github.com/codemyshop/codemyshop.git
cd codemyshop
cp .env.example .env
# Edit .env: at minimum set PG_PASSWORD, REDIS_PASSWORD, NUXT_SECRET
docker compose up -d
docker compose logs -f nuxt   # watch boot
```

Services started:

| Service | Image | Purpose |
|---------|-------|---------|
| `nuxt`     | `ghcr.io/codemyshop/codemyshop:latest` | Nuxt 4 SSR + Nitro server |
| `postgres` | `pgvector/pgvector:pg16`               | DB with vector extension |
| `redis`    | `redis:7-alpine`                       | Sessions, rate-limit, cache |
| `nginx`    | `nginx:alpine`                         | Reverse proxy (TLS, static) |

Nuxt is exposed on `127.0.0.1:3000` by default. Put nginx in front for TLS
and public exposure. You can pin a specific image version by setting
`CODEMYSHOP_VERSION=0.1.1` in `.env`.

To rebuild the image from your local source instead of pulling, comment
out `image:` and uncomment `build: .` under the `nuxt` service in
`docker-compose.yml`.

## Quick start from source

```bash
git clone https://github.com/codemyshop/codemyshop.git
cd codemyshop
cp .env.example .env
# Edit .env: PG_PASSWORD, NUXT_SECRET, etc.

# Make sure PostgreSQL 17 + pgvector and Redis 7 are running locally
# (or point the env vars at a managed instance).

npm install
npm run dev    # http://localhost:3000
```

For a production build from source:

```bash
npm run build
node examples/minimal-tenant/.output/server/index.mjs
```

## Environment variables

See [.env.example](.env.example) for the full list. The minimal required set:

```bash
# Database
PG_HOST=postgres
PG_PORT=5432
PG_USER=codemyshop
PG_PASSWORD=<strong-random-32-chars>
PG_DB=codemyshop
PG_SCHEMA=codemyshop          # any name except 'public' (Drizzle reserved)

# Redis
REDIS_PASSWORD=<strong-random-32-chars>

# Nuxt session / signed cookies
NUXT_SECRET=<strong-random-32-chars>

# AI provider (optional, pick any subset)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
MISTRAL_API_KEY=...

# SMTP for transactional emails
SMTP_HOST=ssl0.ovh.net
SMTP_PORT=465
SMTP_USER=noreply@example.com
SMTP_PASS=<smtp-password>
```

Generate strong secrets:

```bash
# 32 random chars
openssl rand -hex 32
```

## Apply database migrations

The TypeScript schema in `core/server/db/schema-pg/*.ts` is the source
of truth. Generate and apply the SQL migration:

```bash
npm install                             # if not done already
PG_SCHEMA=codemyshop npm run db:migrate # creates the schema + ~50 tables
```

`db:generate` regenerates `core/server/db/migrations/*.sql` from the TS
schema if you change the schema files; `db:migrate` applies the pending
SQL against the database described in `drizzle.config.ts`.

The bundled migration `0000_initial.sql` ships with the repo so a fresh
clone can run `db:migrate` directly without regenerating.

## First admin login

Bootstrap an administrator account with the included CLI:

```bash
npm run seed:admin
# Admin email: you@example.com
# Password (min 12 chars): ********
# First name [Admin]: Alice
# Last name [User]: Doe
# ✓ Created admin: you@example.com
```

To populate the hub with demo data (5 categories, 15 products, 3
customers, 5 orders, 5 blog posts, 2 B2B leads) — useful so the admin
isn't staring at empty pages on first login:

```bash
npm run seed:demo
```

The demo seed is idempotent: running it twice does not create duplicate
rows. It also provisions a minimal subset of the PrestaShop-native
tables (`ps_product`, `ps_category`, `ps_orders`, etc.) on the fly so a
fresh install can render the hub without further setup.

You can also pass everything via env vars (useful in CI / Ansible):

```bash
ADMIN_EMAIL=you@example.com \
ADMIN_PASSWORD=correct-horse-battery-staple \
ADMIN_FIRSTNAME=Alice \
ADMIN_LASTNAME=Doe \
npm run seed:admin
```

The script creates a minimal `ps_employee` row with `id_profile=1`
(historical PrestaShop SuperAdmin profile id, mapped to admin access).

Then log in:

```
URL  : https://your-domain.com/hub
User : the email you used above
Pass : the password you typed
```

Next steps:
1. Change the admin password from `/hub/profile`.
2. Configure your storefront domain in `/hub/admin/settings`.
3. Import your product catalog. CSV / Shopify import helpers are on the
   v0.2.0 roadmap; for now `INSERT` directly into `ps_product` and
   related tables, or use Drizzle from a custom script.

## FAQ

### "ERROR: relation 'cs_*' does not exist"

The schema hasn't been created. Generate and apply migrations from the
TypeScript schema definitions:

```bash
npx drizzle-kit generate
npx drizzle-kit migrate
```

> If you're upgrading from a v0.1.x install where tables were prefixed
> `ps_ac_*`, see [documentation/SCHEMA_HISTORY.md](documentation/SCHEMA_HISTORY.md)
> for the v0.2.0 rename procedure.

### "Error: You can't specify 'public' as schema name"

Drizzle reserves the `public` schema. Set `PG_SCHEMA=codemyshop` (or any
other name) in your `.env`.

### "EADDRINUSE: address already in use :::3000"

Another process is using port 3000. Either kill it (`lsof -i :3000`) or change `PORT` in `.env`.

### Let's Encrypt fails

- Check DNS A record points to your VPS public IP.
- Check ports 80 and 443 are open in your firewall.
- Check the domain is not under DNS-only protection (Cloudflare orange cloud must be temporarily disabled for HTTP-01 challenge).

### How do I migrate from Shopify / WooCommerce / PrestaShop?

The Managed Standard plan includes catalog migration. For Community, see `documentation/MIGRATION_FROM_SHOPIFY.md` (coming soon).

### Where do I report a bug?

[GitHub Issues](https://github.com/codemyshop/codemyshop/issues). Use the bug template. **Security issues**: see [SECURITY.md](SECURITY.md), do not open a public issue.

### Can I use a managed PostgreSQL service (Supabase, RDS) ?

Yes. Set `PG_HOST` to the managed endpoint. For sovereignty, prefer Scaleway Managed Database (Paris region) or OVH Public Cloud Database.
