# Architecture

CodeMyShop is a **single-process TypeScript monolith** for e-commerce. This document explains the technical choices and the rationale behind them.

## High-level diagram

```
                ┌────────────────────────────────────┐
                │          nginx (TLS, rate)         │
                └─────────────────┬──────────────────┘
                                  │
                ┌─────────────────▼──────────────────┐
                │       Nuxt 4 Nitro server          │
                │  ┌──────────────────────────────┐  │
                │  │ Storefront (SSR Vue 3)       │  │
                │  │ Admin hub (SPA Vue 3)        │  │
                │  │ API (server/api/*)           │  │
                │  │ Cron tasks (server/tasks/*)  │  │
                │  │ Centaure AI (LLM client)     │  │
                │  └──────────────────────────────┘  │
                └──┬───────────────────┬─────────────┘
                   │                   │
        ┌──────────▼─────┐    ┌────────▼─────────┐
        │ PostgreSQL 17  │    │    Redis 7       │
        │ + pgvector     │    │ (cache, session) │
        └────────────────┘    └──────────────────┘
```

## Why monolith, not headless

> **Most e-commerce stacks today are "headless": a backend (Magento, Shopify, PrestaShop) communicating with a frontend (Next, Nuxt, Remix) via REST or GraphQL.**

We rejected this approach for CodeMyShop. Here's why:

### Headless costs

- **Two stacks to maintain** — backend (PHP/Java/Ruby) + frontend (TypeScript). Different ecosystems, different debug tools, different deploy pipelines.
- **API bridge complexity** — every change in the data model requires backend + frontend coordination. Versioning hell.
- **Latency tax** — each page renders triggers N internal HTTP calls between front and back. Network latency, serialization cost.
- **Two failure modes** — backend down or frontend down means different incidents, different alerting.
- **Deploy choreography** — you must deploy backend before frontend (or vice versa) without breaking the contract. Atomic deploys are nearly impossible.

### Monolith benefits

- **One codebase** — TypeScript everywhere (server + client). Shared types, shared validation logic.
- **Atomic deploys** — `git push` triggers one CI, one build, one rollout. No version skew.
- **Direct DB access from server routes** — Drizzle ORM in `server/api/*.ts` reads PostgreSQL directly. No HTTP hop.
- **Simple monitoring** — one PM2 process, one log stream, one Prometheus exporter.
- **Faster page loads** — SSR rendering reads from DB in the same process. No internal network round-trip.
- **Easier debugging** — one stack trace from request to DB query.

The cost of monolith is **language flexibility** (you're committed to TypeScript). For an e-commerce stack, this is a feature, not a limitation: the same engineers can ship full-stack features without context-switching.

## Stack choices

### Nuxt 4 (vs Next.js / Remix / SvelteKit)

| Why | What |
|-----|------|
| Auto-imports, file-based routing, layouts | Less boilerplate than Next.js |
| Nitro server with universal deploy targets | Same code runs on Node, Bun, Cloudflare, Vercel, Deno |
| Vue 3 Composition API | Mature, performant, easier to learn than React for non-FE devs |
| Excellent dev experience (hot reload, devtools) | Faster iteration |
| Smaller community than Next, but mature | Acceptable trade-off for the dev ergonomics |

### Drizzle ORM (vs Prisma / TypeORM / Knex)

| Why | What |
|-----|------|
| TypeScript-first with full inference | Schema becomes the source of truth, no codegen |
| Generates real SQL, easy to debug | `console.log(query.toSQL())` shows the actual SQL |
| Lightweight (~7 kB runtime) | Faster cold start |
| Direct support for raw SQL escape hatch | Complex queries don't fight the ORM |
| Schema introspection from existing PG tables | Easy migration from legacy databases |

### PostgreSQL 17 + pgvector (vs MySQL / MariaDB / MongoDB)

| Why | What |
|-----|------|
| ACID by default, no surprise edge cases | Data integrity guaranteed |
| pgvector for embeddings (Centaure AI) | One database for transactional + vector search |
| JSONB columns for flexible schemas | Best of relational + document |
| Mature ecosystem, sovereign-friendly (PostgreSQL License) | Run on Scaleway, OVH, Hetzner |
| Excellent query planner | Predictable performance at scale |

### Redis 7 (vs Memcached / in-memory)

| Why | What |
|-----|------|
| Pub/sub for real-time hub updates | Cross-process notifications |
| Persistent data structures | Sessions survive restart |
| Rate limit primitives | Built-in `INCR` + `EXPIRE` |

### nginx (vs Caddy / Traefik)

| Why | What |
|-----|------|
| Battle-tested at scale | Predictable behavior under load |
| Excellent rate limiting | Anti-bot, DDoS mitigation |
| Easy SSL (certbot) | Let's Encrypt integration |
| Static file serving | Offload from Nuxt for assets |

## Multi-tenancy

CodeMyShop is **multi-tenant by design** at the deploy layer, not at the database layer. We do **not** use schema-per-tenant or row-per-tenant (the Shopify SaaS model). Instead, each tenant gets its own **isolated container stack** — its own Nuxt process, its own PostgreSQL database, its own Redis if needed.

```
host VPS (or Docker host / Kubernetes node)
│
├── acme_postgres      ─┐
├── acme_redis           │  tenant "acme"     → port 3001 → acme.com
├── acme_nuxt          ─┘
│
├── monaco_postgres    ─┐
├── monaco_redis         │  tenant "monaco"   → port 3002 → monaco-skate.com
├── monaco_nuxt        ─┘
│
└── paris_postgres     ─┐
    paris_redis          │  tenant "paris"    → port 3003 → paris-vape.com
    paris_nuxt         ─┘

           ▲                       ▲
           │                       │
           │                       └── each Nuxt process is a build of a
           │                           tenant pack that does:
           │                              extends: ['../../core']
           │                           in its nuxt.config.ts
           │
           └── physical isolation: a SQL bug in tenant A literally cannot
               read tenant B's data — they're in different databases on
               different processes.
```

### How the code stays single

There is **one codebase**, the `core/` layer (this repo). Each tenant is a tiny "tenant pack" — a Nuxt sub-project that extends `core/`:

```ts
// examples/minimal-tenant/nuxt.config.ts
export default defineNuxtConfig({
  extends: ['../../core'],   // ← inherits all of core: pages, components, API routes, modules
  app: {
    head: { title: 'Acme Shop' },
  },
  runtimeConfig: {
    public: {
      brandName: 'Acme Shop',
      psFrontUrl: 'https://acme.com',
      vertical: 'general',   // 'food' | 'fashion' | 'general'
    },
  },
})
```

A tenant pack typically holds only: `nuxt.config.ts`, optional `pages/` overrides, optional `components/` overrides (Nuxt layer priority makes `clients/<tenant>/components/Foo.vue` win over `core/components/Foo.vue`), and a `theme/` directory.

When you fix a bug or ship a feature in `core/`, **every tenant gets it on the next deploy** — without touching any tenant-specific code.

### Why this design (vs Shopify-style schema-per-tenant)

| | **Container-per-tenant** (CodeMyShop) | **Schema-per-tenant** (typical SaaS) |
|---|---|---|
| Cross-tenant data leak | Physically impossible (separate DBs) | Possible (one bad `WHERE` clause = catastrophe) |
| Tenant migration to own VPS | `docker save` + `docker load` → done | Requires schema export + replay |
| Performance isolation | A heavy tenant doesn't slow neighbors | Shared DB CPU/IO → noisy neighbor risk |
| Compliance (GDPR data residency) | Per-tenant DB can sit in any country | All tenants in one DB → harder to argue |
| Cost at scale | Higher (1 DB per tenant) | Lower (shared) |
| Best fit | PaaS / agency / sovereign hosting | Pure SaaS with thousands of tiny tenants |

CodeMyShop's target is **PME merchants and agencies hosting 5-50 clients**, where physical isolation is worth the extra container overhead. If you operate a SaaS with 10 000+ free-tier tenants, you should fork and add schema-per-tenant routing — but that's a different product.

### How to operate multiple tenants

The `examples/multi-tenant/` directory in this repo is a working example of two tenants side-by-side. The recommended workflow:

1. **Bootstrap a tenant pack** — `bin/init-tenant.sh acme --brand "Acme Shop" --domain acme.com` creates `clients/acme/` with a working `nuxt.config.ts`, `seed.yaml`, and gitignored `.env` (with a random `HUB_SESSION_SECRET`).
2. **Provision the tenant DB** — start a dedicated `acme_postgres` container with its own credentials (one-liner in [INSTALL-MULTI-TENANT.md](INSTALL-MULTI-TENANT.md)).
3. **Seed the DB** — `npm run seed:tenant -- acme --reset --with-admin admin@acme.com` runs the migration + populates theme/header/footer/categories from `clients/acme/seed.yaml`.
4. **Build and run** — each tenant pack is a normal Nuxt project: `cd clients/acme && npm run build && npm run preview` (or behind PM2 in production).
5. **Route via nginx** — one `server { server_name acme.com; proxy_pass http://127.0.0.1:3001; }` block per tenant.

Full procedure including production hardening (TLS per tenant, backups per tenant, scaling): see [INSTALL-MULTI-TENANT.md](INSTALL-MULTI-TENANT.md).

For most installations, a single tenant is sufficient. The single-tenant `docker-compose.yml` at the repo root covers that case in one command. Multi-tenant is the persona for **agencies, hosters, and franchise networks**.

## Naming convention

All custom tables are prefixed `cs_` (CodeMyShop). Tables are singular (`cs_theme`, not `cs_themes`). i18n columns live in sibling `<table>_lang` tables with composite primary keys `(id_<entity>, id_lang)` — the PrestaShop-native i18n pattern, kept for its proven mechanics.

> **History.** Tables were prefixed `ps_ac_` until v0.2.0 (CodeMyShop was originally a PrestaShop extension named "ac"). The v0.2.0 release renamed every table from `ps_ac_*` to `cs_*` to reflect the rebrand and to remove confusion with native PrestaShop tables (`ps_product`, `ps_category`). See [documentation/SCHEMA_HISTORY.md](documentation/SCHEMA_HISTORY.md) for the migration story.

See [documentation/NAMING.md](documentation/NAMING.md) for the full convention.

## Module system

Domain logic is organized in `core/modules/{domain}/server/utils/{domain}.ts` (the **façade**). The façade is the **only** way to read/write tables of that domain. No raw SQL outside facades.

Each module has a manifest declaring its API routes, hooks, dependencies, and tables.

```
core/modules/
├── bank/           # bank sync (Powens, N26)
├── invoice/        # invoicing
├── urssaf/         # French URSSAF declarations (specific to France AE/EI)
├── aetracker/      # AE ceiling gauge
├── faq/            # polymorphic FAQ
├── quote/          # quotes
├── subscription/   # subscriptions
├── homepage-section/
└── ...
```

## Centaure AI

Centaure is the integrated AI subsystem for autonomous content generation:

- **Inputs**: product catalog, GSC data, Matomo analytics, customer messages
- **Outputs**: SEO articles, enriched product descriptions, structured JSON-LD, FAQ entries, image alt-text
- **Providers**: pluggable via env (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `MISTRAL_API_KEY`). The default routing logic prefers cheapest-capable provider per task.
- **Open prompts**: every prompt is open-source under AGPL-3.0 in `core/server/prompts/`. You can audit them, modify them, or replace them with your own.

## Security model

- All hub routes require authentication via HMAC-signed cookies (`HUB_SESSION_SECRET`).
- Hub URL is randomized via the **knock-gate** pattern (nginx slug + cookie). Brute-force resistant by design.
- Rate limits per IP and per session for sensitive endpoints.
- All DB queries go through Drizzle ORM (parameterized) — no raw concatenation.
- CSP headers configured in `nuxt.config.ts`.
- Backups encrypted at rest (Scaleway S3 bucket policy).

For security disclosure, see [SECURITY.md](SECURITY.md).

## Performance targets

- **PageSpeed mobile**: 95+ on storefront pages
- **TTFB** (cached): < 100 ms
- **TTFB** (cold SSR): < 400 ms
- **Cold deploy** (full rebuild): < 90 seconds with `experimental.buildCache: true`

## What's NOT in this repo

To keep the public repo focused and the dependency tree manageable:

- Tenant-specific configurations (`clients/*`)
- Internal documentation (strategy, roadmap, fiscal doctrine)
- Memory and personal notes
- Atlas / OSINT scripts (specific to AC's prospecting needs)
- Marketing copy of codemyshop.com (lives in a separate tenant)

These are not necessary for installing and running CodeMyShop.

## Roadmap

See [ROADMAP.md](ROADMAP.md).
