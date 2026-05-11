# Onboarding a new tenant — full reference

> Companion to [INSTALL-MULTI-TENANT.md](../INSTALL-MULTI-TENANT.md) (which is the operational checklist). This document is the **conceptual reference**: what each piece does, how the pieces fit together, and the patterns to respect.

**Target time per tenant**: 30 minutes from decision to live site, after the first one (which always takes longer because you're learning).

---

## TL;DR — five-step recipe

```bash
# 1. Bootstrap the tenant pack (templated from minimal-tenant)
./bin/init-tenant.sh acme \
    --brand "Acme Shop" \
    --domain acme.com \
    --vertical general

# 2. Provision the per-tenant PostgreSQL container
PG_PASSWORD=$(openssl rand -hex 32)
docker run -d --name acme_postgres \
    -p 127.0.0.1:5433:5432 \
    -e POSTGRES_DB=acme -e POSTGRES_USER=acme \
    -e POSTGRES_PASSWORD="$PG_PASSWORD" \
    pgvector/pgvector:pg16

# 3. Update clients/acme/.env with PG_PASSWORD, then commit seed.yaml
sed -i "s|REPLACE-AFTER-CREATING-PG-CONTAINER|$PG_PASSWORD|g" clients/acme/.env
git add clients/acme/seed.yaml clients/acme/nuxt.config.ts
git commit -m "feat(tenant): onboard acme"

# 4. Apply schema + seed from clients/acme/seed.yaml
PG_SCHEMA=acme npm run db:migrate
npm run seed:tenant -- acme --reset --with-admin admin@acme.com 'temp-pass'

# 5. Build + run
cd clients/acme && npm install && npm run build
PORT=3001 pm2 start npm --name "acme-nuxt" -- run preview
pm2 save
```

After step 5, add the nginx vhost and TLS cert (see [INSTALL-MULTI-TENANT.md § "nginx vhost + TLS"](../INSTALL-MULTI-TENANT.md#tls-per-tenant-certbot)).

---

## 1. `bin/init-tenant.sh` — bootstrap the repo

Creates `clients/<client-id>/` from a template (default: `examples/minimal-tenant/`).

**Automatic substitutions:**

| File | Substituted |
|---|---|
| `nuxt.config.ts` | `brandName`, `psFrontUrl`, `vertical`, `title` |
| `seed.yaml` (if present) | `client_id`, `pg_db`, `pg_user` |
| `.env` (generated) | random `HUB_SESSION_SECRET`, port, PG placeholder |

**Conventions:**

- `<client-id>`: kebab-case (`acme`, `monaco-skate`, `paris-vape-lab`). Used as directory name, PG database name (with `-` → `_`), and PM2 process name suffix.
- `--vertical`: drives vertical-specific UI logic in `core/`:
  - `food`: price-per-kg display, weight handling, food-grade compliance helpers
  - `fashion`: shopping-bag icon, size selectors, multi-image galleries
  - `general`: neutral defaults
- `--copy-from`: any directory under `clients/` or `examples/`. Use `--copy-from monaco-skate` to clone an existing tenant configuration as a starting point.

---

## 2. `seed.yaml` — single source of truth for tenant content

Format consumed by `npm run seed:tenant`. Covers every DB-First content brick:

```yaml
tenant:
  client_id: acme
  pg_db: acme
  pg_user: acme
  languages: [en, fr]              # FR=2 secondary; EN=1 default
  id_lang_default: 1

theme:                             # → cs_theme
  color_primary: '#dc2626'
  color_header_bg: '#ffffff'
  color_topbar_bg: '#0a0a0a'
  color_topbar_text: '#ffffff'
  color_footer_bg: '#0a0a0a'
  font_family: 'Inter, system-ui, sans-serif'
  content_width: '7xl'             # 6xl | 7xl | 8xl | full
  default_color_mode: light

header:                            # → cs_header + lang
  logo_src: /img/logo.svg
  contact_email: hello@acme.com
  feat_show_search: 1
  feat_show_login: 1
  feat_show_cart: 1
  feat_sticky_header: 0
  topbar_show_languages: 1         # FR/EN switcher in topbar
  nav_bg_color: '#0a0a0a'
  nav_text_color: '#ffffff'
  lang:
    en: { logo_alt: 'Acme', topbar_message: 'Free shipping over €60' }
    fr: { logo_alt: 'Acme', topbar_message: 'Livraison offerte dès 60 €' }

categories:                        # → ps_category + lang under Home
  - slug: catalog
    position: 0
    lang:
      en: { name: 'Catalog', description: 'All products.' }
      fr: { name: 'Catalogue', description: 'Tous les produits.' }

megamenu:                          # → cs_megamenu
  source: categories               # auto-map from categories above
  # OR explicit:
  # items:
  #   - { kind: category, slug: catalog, lang: { en: 'Shop', fr: 'Boutique' } }

homepage_sections:                 # → cs_homepage_section + blocks
  - type: hero
    position: 10
    lang:
      en: { title: 'Welcome to Acme', subtitle: 'Sovereign e-commerce' }
      fr: { title: 'Bienvenue chez Acme', subtitle: 'E-commerce souverain' }
  - type: features                 # other types: categories | brand-strip |
    position: 20                   # new-products | bestsellers | faq |
    blocks:                        # narrative-blocks | banners | blog
      - kind: feature
        image: /img/feature-shipping.svg
        href: /shipping
        lang:
          en: { label: 'Free shipping', description: 'On orders over €60' }
          fr: { label: 'Livraison offerte', description: 'Dès 60 €' }

footer:                            # → cs_footer_config + cols + social
  theme: dark
  logo_src: /img/logo.svg
  contact_email: hello@acme.com
  contact_address: '1 rue Example, 75001 Paris, France'
  lang:
    en: { description: 'Sovereign e-commerce.', copyright: '© 2026 Acme' }
    fr: { description: 'E-commerce souverain.', copyright: '© 2026 Acme' }
  columns:
    - lang: { en: 'Shop', fr: 'Boutique' }
      links:
        - href: /catalog/
          lang: { en: 'All products', fr: 'Tous les produits' }
  social:
    - { platform: instagram, href: 'https://instagram.com/acme' }
    - { platform: youtube,   href: 'https://youtube.com/@acme' }
```

The seed file is **committed to git**. It's content config, not a secret. Anyone reviewing the PR can audit what will render on the tenant's homepage.

---

## 3. `npm run seed:tenant` — apply the seed

```bash
# Dry-run: print SQL without executing
npm run seed:tenant -- acme --dry-run

# Execute (idempotent: re-running is safe)
npm run seed:tenant -- acme --reset

# + bootstrap the first admin in one command
npm run seed:tenant -- acme --reset \
    --with-admin admin@acme.com 'temp-password-change-on-first-login'

# Output to a file for review
npm run seed:tenant -- acme --out /tmp/acme-seed.sql
```

`--reset` truncates and re-inserts every tenant content table (`cs_theme`, `cs_header*`, `cs_megamenu*`, `cs_homepage_section*`, `cs_footer_config*`, `ps_category*`). The two PrestaShop root categories (id 1 and 2) are preserved. Use it as your nightly cron-reset for staging tenants.

---

## 4. Per-tenant `.env` (gitignored)

Located at `clients/<client-id>/.env`. Generated by `bin/init-tenant.sh` with safe defaults; you only need to fill in `PG_PASSWORD` after creating the tenant Postgres container.

| Variable | Purpose | Source |
|---|---|---|
| `PORT` | Nuxt PM2 listen port | unique per tenant |
| `PG_HOST`, `PG_PORT`, `PG_DB`, `PG_USER`, `PG_PASSWORD` | Tenant Postgres connection | dedicated container |
| `DATABASE_URL` | Drizzle ORM single-string form | derived from above |
| **`HUB_SESSION_SECRET`** | JWT signing key (≥ 32 hex chars) | `openssl rand -hex 32` |
| `NUXT_SECRET` | Nuxt cookie/session secret | same as above |
| `NUXT_PUBLIC_PS_FRONT_URL` | Public URL of the tenant | final domain |
| `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` / `MISTRAL_API_KEY` | AI provider keys (optional) | per-tenant or shared |

`.env.example` documents every option. **Never** commit a real `.env`.

---

## 5. `runtimeConfig.public` (in tenant's `nuxt.config.ts`)

Accessible from both client and server via `useRuntimeConfig().public`. Drives tenant-aware behavior in `core/`.

| Key | Values | Effect on `core/` |
|---|---|---|
| `brandName` | string | Logo alt text, page titles, JSON-LD Organization |
| `vertical` | `'food'` / `'fashion'` / `'general'` | Price-per-kg display, weight handling, cart icon, label conventions |
| `piliers` | `string[]` (e.g. `['catalog']` or `['catalog:6']`) | Category URL patterns, sitemap structure |
| `b2bMode` | `boolean` | Show ex-tax prices, "request a quote" instead of cart |
| `i18nLocales` | `string[]` (e.g. `['fr', 'en']`) | Active secondary locales (default is `[]` = single-lang) |
| `isDemo` | `boolean` | Display a "DEMO" pill (bottom-left) |
| `psFrontUrl` | URL string | Canonical absolute URLs for SEO, sitemap, JSON-LD |
| `contactEmail` | email | Mailto links, structured data |

Example (tenant pack `nuxt.config.ts`):

```ts
export default defineNuxtConfig({
  extends: ['../../core'],
  runtimeConfig: {
    public: {
      brandName: 'Acme Shop',
      vertical: 'general',
      piliers: ['catalog'],
      b2bMode: false,
      i18nLocales: ['fr'],         // EN default + FR secondary
      isDemo: false,
      psFrontUrl: 'https://acme.com',
      contactEmail: 'hello@acme.com',
    },
  },
})
```

---

## 6. Patterns to respect (DB-First doctrine)

The CodeMyShop monolith follows strict patterns to keep `core/` tenant-agnostic:

- **No JSON i18n in DB columns.** All translations live in `*_lang` sibling tables with composite primary keys `(id_X, id_lang)`. The PrestaShop-native pattern.
- **No tenant-specific code in `core/`.** Differences are expressed via `runtimeConfig.public` keys (read above). If you need tenant-specific UI: drop a `.vue` in `clients/<id>/components/` — the Nuxt layer system gives it priority over `core/`.
- **No hard-coded business strings in components.** Every user-visible string passes through `t('domain.key')`. Tenant translations live in the `ps_translation` table.
- **No raw SQL outside façades.** Each domain (`cart`, `order`, `product`, etc.) has a single `core/modules/<domain>/server/utils/<domain>.ts` façade. Bypassing it is a violation.

These rules exist because they keep the multi-tenant model coherent. Breaking one breaks the promise that `core/` is shared.

---

## 7. Verifying isolation between tenants

After onboarding tenant 2, you should be able to verify physical isolation:

```bash
# Each tenant has its own DB, on its own port:
docker exec acme_postgres   psql -U acme   -d acme   -c '\dt'
docker exec monaco_postgres psql -U monaco -d monaco -c '\dt'

# Same tables ('cs_*'), different content per DB.
docker exec acme_postgres   psql -U acme   -d acme   -c 'SELECT count(*) FROM ps_product;'
docker exec monaco_postgres psql -U monaco -d monaco -c 'SELECT count(*) FROM ps_product;'

# A bug in core/ that drops ps_product would only affect the tenant whose
# Nuxt process executed it — never both.
```

This is the operational expression of the design principle. **Demonstrate it to your clients** — it's a strong selling point against SaaS competitors who rely on logical isolation.

---

## 8. Common pitfalls (collected scars)

| Pitfall | Symptom | Mitigation |
|---|---|---|
| Two parallel `nuxt build` on same tenant | `.output/` corrupted → `ERR_MODULE_NOT_FOUND` 500 loop | Lock file `/tmp/deploy-<tenant>.lock` in your deploy script |
| Forgetting `pm2 reload --update-env` after editing `.env` | New env vars ignored | Always pass `--update-env` |
| `HUB_SESSION_SECRET` < 32 chars | `/hub/login` 500 (`session-crypto.ts`) | `openssl rand -hex 32` (`init-tenant.sh` does this for you) |
| Sharing `HUB_SESSION_SECRET` between tenants | A user logged into tenant A can forge a session for tenant B | One unique secret per tenant. **Never reuse.** |
| `psql -f migration.sql` without `ON_ERROR_STOP=1` | Migration partially applied, exit code 0, silent corruption | Always `psql -v ON_ERROR_STOP=1 -f` |
| Editing `core/` for a single client's whim | `core/` drifts from upstream, multi-tenant promise breaks | Lift the change into `runtimeConfig` keys or a tenant-local component |
| Skipping a tenant's migration after `core/` schema change | New columns missing → `SELECT … column "x" does not exist` | After every `core/` schema bump, loop migrations across **every** tenant DB |

---

## 9. Roadmap (industrialization not yet shipped)

The following are in scope for v0.3.0+:

- [ ] `bin/provision-vps.sh` — Ansible playbook: VPS + Docker + nginx + certbot + tenant Postgres container in one command
- [ ] `bin/onboard-tenant.sh` — orchestrator: chain `init-tenant.sh` + provision + seed + deploy
- [ ] `npm run migrate:all-tenants` — apply schema migrations across every tenant DB declared in `clients/*/seed.yaml`
- [ ] Kubernetes Helm chart for one release per tenant (target: hosters with 100+ tenants)
- [ ] Grafana dashboard JSON for per-tenant metrics

---

## See also

- [INSTALL-MULTI-TENANT.md](../INSTALL-MULTI-TENANT.md) — operational checklist for the agency persona
- [ARCHITECTURE.md § Multi-tenancy](../ARCHITECTURE.md#multi-tenancy) — design rationale (container-per-tenant vs schema-per-tenant)
- [examples/multi-tenant/](../examples/multi-tenant/) — working two-tenant Docker Compose example
- [examples/minimal-tenant/](../examples/minimal-tenant/) — smallest possible tenant pack
