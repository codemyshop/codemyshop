# Changelog

All notable changes to CodeMyShop will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **`npm run seed:tenant`** — declarative YAML → SQL seeder for multi-tenant onboarding (theme, header, categories, footer, optional admin via `--with-admin`). Reads `clients/<id>/seed.yaml` (or `examples/multi-tenant/seeds/<id>.seed.yaml`). MVP scope; megamenu/homepage_sections/blog seed land in v0.3.x. Adds `js-yaml` dependency.
- **Pixel-art logo + matching social preview**: new `core/public/logo-codemyshop.png` (512×512 isometric storefront sprite) and `.github/social-preview.png` (1280×640 OG card). Replaces the placeholder SVG in the README header. Old SVG kept as unreferenced vector fallback.
- **`./ship-oss` wrapper** (private side, not shipped in OSS) — auto-detect next version from remote tags, run sync-codemyshop-oss.sh --ship, watch docker.yml workflow, report SUCCESS/FAILED. Detects no-op syncs (empty diff → no commit/tag/push).

### Internal
- Sync pipeline scrubber (private side, not shipped in OSS): added **tier-0c** that catches `Alexandre Carette` mentions in inline content (template strings, JSON, fallbacks, webmanifest) — not just `@author`/`@copyright` headers. Closes the leak that produced 7 residual mentions in v0.2.4.
- Sync pipeline FR→EN translate (private side): the regex now extracts the closing `*/` of multiline JSDoc as a separate suffix instead of bundling it into the translatable text. Prevents the v0.2.4 build failure where Haiku silently dropped `*/` and Vite SFC choked on unclosed comments.

## [0.2.8] — 2026-05-10

### Fixed
- `package-lock.json` regenerated to include `js-yaml` (added in v0.2.7 for `npm run seed:tenant` but lockfile was out of sync, breaking `npm ci` in the Dockerfile). Unblocks Docker image publication.

## [0.2.7] — 2026-05-10

### Synced from private monolith 94be5e74

- i18n storefront migration (5 components: LoyaltyBlock, BlogSearch, MobileStickyBar, PreviewBanner, FirstOrderBanner) wired to `useT()` composable + 37 keys seeded in `ps_translation`/`cs_translation` with domain='oss'.
- Editions doctrine v3: 3 tiers (Community / Enterprise 800€/mo flat / Custom on quote). Enterprise activable packs (AI / Data / SEO / Banking / Food / Vape / Fashion / Jewelry) all bundled in flat fee — pack structure kept as documentation only.
- Naming convention docs aligned on `cs_*` (CONTRIBUTING.md, ARCHITECTURE.md, INSTALL.md) + new `documentation/NAMING.md` (~210 lines, full reference).
- Open-core feature flags POC: 6 enterprise features seeded in `ps_ac_marketplace_feature` (lead.capa, lead.ca, lead.scoring, sav.sla, sav.sentiment, subscription.churn) + new `EnterpriseUpgradeCard.vue` component + POC gating CA/CAPA columns in `pages/hub/leads/index.vue`.
- Multi-tenant docs (companion to v0.2.7): `INSTALL-MULTI-TENANT.md`, `examples/multi-tenant/` (2 tenants side-by-side), `bin/init-tenant.sh`, `documentation/{NAMING,ONBOARDING_TENANT}.md`.
- ⚠️ Build broken on this tag — superseded by 0.2.8 which fixes the lockfile.

## [0.2.6] — 2026-05-10

### Synced from private monolith 5fce56bc

- Tier-0c scrubber + JSDoc-preserving translate (see Internal section under Unreleased above for the cause).
- 7 inline `Alexandre Carette` leaks from v0.2.4 fully scrubbed.
- 4 JSDoc files re-fixed by the regex change (ProductCard.vue, connectors/base.ts, cart-db.ts, unity-label.ts) — Docker build green.

## [0.2.5] — 2026-05-10

### Fixed
- Build: closed JSDoc comments mangled by FR→EN translate (ProductCard, connectors, cart-db, unity-label) — unblocks Docker image publication.

## [0.2.4] — 2026-05-10

### Synced from private monolith 4934d804

- *(describe what changed)*

## [0.2.3] — 2026-05-10

### Synced from private monolith 7b28d3b5

- *(describe what changed)*

## [0.2.2] — 2026-05-10

### Added
- **Vitest unit tests**. The repo ships its first 27 tests across 3
  files, all passing in ~420 ms:
  - `core/utils/__tests__/deepMerge.test.ts` — recursive merge,
    array replacement, null/undefined handling, immutability
  - `core/utils/__tests__/locale-route-roots.test.ts` — segment
    localisation in the 4 supported locales (en/de/es/it),
    canonical roundtrip
  - `core/utils/__tests__/api-error.test.ts` — i18n error key
    construction, statusMessage fallback, null/undefined safety
- `npm test` (= `vitest run`) and `npm run test:watch` scripts
- **CI gating on tests**. The new `Tests` job in `.github/workflows/ci.yml`
  runs on every push and PR, and `Build & verify` now `needs: test`.
  No green tests, no merge

## [0.2.1] — 2026-05-10

### Changed
- **Container image is now ~224 MB instead of ~447 MB** (–50%). The
  Dockerfile switched from `node:22-bookworm-slim` to `node:22-alpine`
  for both the build and runtime stages. The system `libvips42`
  package was dropped from the runtime — sharp 0.34+ ships its own
  `libvips-cpp.so` under `node_modules/@img/sharp-libvips-linuxmusl-x64`
  and Nitro externalisation copies it into `.output/server/node_modules`
- `tini` is still the PID 1 entrypoint; healthcheck and ports unchanged
- This is a **drop-in upgrade**: `docker pull ghcr.io/codemyshop/codemyshop:0.2.1`
  works as a direct replacement for `:0.2.0`, no schema or config change

## [0.2.0] — 2026-05-10

**Breaking change for fresh installs:** every CodeMyShop-owned table is
renamed from `ps_ac_<entity>` to `cs_<entity>` — the rename announced
for v0.3.0 in `SCHEMA_HISTORY.md` is shipping ahead of schedule. The
PrestaShop-derived tables (`ps_product`, `ps_orders`, `ps_customer`,
`ps_cms`, …) keep their `ps_*` prefix for now (that's the v0.4.0 work).

A v0.1.x → v0.2.0 in-place upgrade is **not** supported: renaming
~50 tables in production safely requires a migration script we have
not written yet. If you're running a v0.1.x install, stay there until
we publish that script. Fresh installs of v0.2.0 are clean by default.

### Changed
- ~50 Drizzle schemas in `core/server/db/schema-pg/*.ts`: every
  `pgTable('ps_ac_<entity>', …)` is now `pgTable('cs_<entity>', …)`
- `core/server/db/migrations/0000_initial.sql`: 230 SQL identifiers
  rewritten (CREATE TABLE, indexes, foreign keys)
- 281 source files in total touched by the rename pass — covers raw
  SQL queries inside Drizzle code and any string literal that
  referenced a custom table by name
- `SECURITY.md` *Hardening checklist*: nothing changes for self-hosters
  beyond running `npm run db:migrate` against a fresh database

### Internal — sync pipeline (private repo)
- `automation/sync-codemyshop-oss.sh` now applies a fifth scrubber tier
  (`tier-5 schema prefix`) that rewrites `\bps_ac_*` → `cs_*` at sync
  time. Source of truth on the private side stays `ps_ac_*` until we
  ship a coordinated `ALTER TABLE … RENAME` against production tenants
- The whole rename is therefore reversible at any moment: revert the
  tier-5 rule, re-ship, and the public schema is back to `ps_ac_*`

## [0.1.7] — 2026-05-10

First automated snapshot from the private monolith. No new application
features compared to v0.1.6 — this release is the validation of the
public ↔ private sync pipeline (`automation/sync-codemyshop-oss.sh`)
that produces every future tag. The image, the cosign signature and
the SBOM attestation are all generated end-to-end from a single command.

### Added
- `protected-paths.txt` mechanism in the sync pipeline: files that have
  been hand-cleaned on the public side (e.g. `useClientDetection.ts`
  with an empty `FALLBACK_REGISTRY`, `drizzle-pg.ts` referencing only
  the 54 surviving public schemas) are excluded from rsync so the
  scrubber can't accidentally re-introduce private imports

### Changed
- 614 source files: `@author Alexandre Carette` headers rewritten to
  `CodeMyShop <noreply@codemyshop.com>` to reflect the OSS owner
- 617 files: `alexandrecarette.fr` references rewritten to
  `codemyshop.com` (domains, mailto, comments)
- ~70 files: capitalised tenant names and lowercase tenant-slug variants
  rewritten to `Example Shop` / `Example Vape` placeholders so the
  public tree stays free of operator-specific tenant names
- All operator-specific domain references rewritten to `example-*.com`
  placeholders

### Internal
- `automation/sync-codemyshop-oss.sh` (in the private repo) now drives
  every public release: rsync `--existing -c`, four-tier scrubber
  (string-literal / domain / email / word-boundary), broken-import
  + tenant-mention sanity scan, anti-leak audit (secrets, `/home/ubuntu`
  paths), interactive `--ship vX.Y.Z` mode that bumps `package.json`,
  inserts a CHANGELOG skeleton, commits, tags, pushes, and triggers
  `docker.yml` (cosign keyless + CycloneDX SBOM) automatically

## [0.1.6] — 2026-05-10

### Added
- Container images on `ghcr.io/codemyshop/codemyshop` are now signed with [cosign](https://docs.sigstore.dev/cosign/overview/) using **keyless OIDC** (no static private key — the signing identity is the GitHub Actions workflow itself, recorded in the public Sigstore transparency log)
- Each image ships a **CycloneDX SBOM** generated by [syft](https://github.com/anchore/syft) and attached as a cosign attestation (predicate type `https://cyclonedx.org/bom`). The SBOM lists every package included in the image with version + license, ready for CVE scanning (`grype`) and compliance review
- `SECURITY.md` § *Verifying releases* — copy-paste recipes for `cosign verify` and SBOM download
- `README.md` § *Provenance* — short pointer to the verification flow
- The SBOM is also uploaded as a workflow artifact (`sbom-cyclonedx`, 90-day retention) for users who can't run cosign

### Changed
- `.github/workflows/docker.yml` — added `id-token: write` permission (OIDC), `id: build` on the build-push step (digest exposure), and four new steps: cosign install, image sign, SBOM generation, SBOM attestation
- `SECURITY.md` § *Supply chain* — replaced the inaccurate "GPG-signed tags" claim with the actual cosign + SBOM provenance story

## [0.1.5] — 2026-05-10

### Added
- `documentation/SCHEMA_HISTORY.md` explaining the historical `ps_ac_*` prefix, why we kept it for v0.1.x, and the planned rename in v0.3.0
- `.github/ISSUE_TEMPLATE/bug_report.yml` and `feature_request.yml` (structured forms with version, environment, repro, expected/actual)
- `.github/ISSUE_TEMPLATE/config.yml` redirects open-ended questions to GitHub Discussions and security reports to `SECURITY.md`
- `.github/pull_request_template.md` with a brief checklist (CI green, CHANGELOG updated, no leaks)
- GitHub Discussions enabled on the repository

### Changed
- README "Community" section now reflects the actual state (Discussions live, Discord postponed until there are enough active installs to keep a channel alive)
- README architecture link points to `SCHEMA_HISTORY.md` for the table-prefix question

## [0.1.4] — 2026-05-10

### Added
- `.github/workflows/ci.yml` — runs on every push to `main` and every pull request: `npm ci`, syntax-checks the helper scripts, and runs the full Nuxt build. Catches broken installs and broken builds before they hit `main`.
- A second informational `typecheck` job runs `nuxi typecheck` on every PR (kept as `continue-on-error: true` while we mop up the remaining TypeScript debt). Gives us a public trendline without gating merges yet.
- New npm scripts: `npm run typecheck` (runs `nuxt prepare` then `nuxt typecheck` on the example tenant), `npm run syntax:check` (validates `scripts/*.mjs`), and `npm run prepare:nuxt`.
- CI status badge in the README header.
- `examples/minimal-tenant/tsconfig.json` extending the Nuxt-generated `.nuxt/tsconfig.json` so external editors and CI can resolve project types.

### Fixed
- `core/server/utils/theme-css-generator.ts`: fall back through a non-null assertion on `RADIUS_MAP.md` so the type checker accepts the borderRadius lookup
- `core/tailwind.config.ts`: declare an explicit `content: []` (the `@nuxtjs/tailwindcss` module injects the real globs at build time) to satisfy the Tailwind `Config` type
- `core/utils/types-reexport.ts`: re-export `NavItem` (the actual exported name) instead of the historical `MenuItem`

## [0.1.3] — 2026-05-10

### Added
- `npm run seed:demo` — populates a fresh install with demo data so the admin hub looks alive at first login: 5 categories, 15 products with prices/stock/cover images, 3 customers + addresses, 5 orders (mix of pending / paid / shipped / delivered), 5 blog posts, 2 B2B quote requests
- The seed script provisions a minimal subset of the PrestaShop-native tables (`ps_lang`, `ps_shop`, `ps_currency`, `ps_country`, `ps_customer`, `ps_address`, `ps_category(_lang)`, `ps_product(_lang|_shop)`, `ps_image`, `ps_specific_price`, `ps_stock_available`, `ps_orders`, `ps_order_detail`, `ps_order_state(_lang)`, `ps_cms(_lang)`) on the fly via `CREATE TABLE IF NOT EXISTS` so the runtime has somewhere to read from. A full PrestaShop schema migration remains on the v0.2.0 roadmap.
- All seeds are idempotent — re-running `seed:demo` is safe and produces no duplicates

## [0.1.2] — 2026-05-10

### Added
- Initial Drizzle SQL migration `core/server/db/migrations/0000_initial.sql` (~50 tables, 1500 lines of DDL) — `npm run db:migrate` brings a fresh PostgreSQL up to date in one command
- `npm run db:generate` / `npm run db:migrate` scripts wired to `drizzle-kit`
- `npm run seed:admin` interactive CLI to bootstrap a hub administrator (creates a minimal `ps_employee` row, hashes password with bcrypt). Accepts `ADMIN_EMAIL` / `ADMIN_PASSWORD` env vars for non-interactive use.
- `README.md` files in the three stub modules (`core/modules/{academy,hub,impersonation}/`) clearly flagging them as no-ops with a v0.2.0 implementation pointer

### Fixed
- Renamed duplicated index names in `pricing.ts` and `lot.ts` so `drizzle-kit generate` no longer aborts on conflicts

## [0.1.1] — 2026-05-09

### Added
- Multi-stage `Dockerfile` (debian-slim base, libvips, non-root user, tini PID 1, healthcheck on `/api/health`)
- Public Docker image published on GitHub Container Registry: `ghcr.io/codemyshop/codemyshop:{0.1.1, 0.1, latest}` (~446 MB, linux/amd64)
- GitHub Action `.github/workflows/docker.yml` builds and pushes the image automatically on every `v*.*.*` tag (and via manual dispatch)
- `.dockerignore` to keep secrets and dev artifacts out of the build context
- `docker-compose.yml` now pulls the published image by default; opt-in to `build: .` by uncommenting one line

### Changed
- `pgSchema()` now reads `process.env.PG_SCHEMA` (default `codemyshop`) — the previous default `public` is rejected by Drizzle ORM as a reserved schema name
- Docker is now the recommended install path; `INSTALL.md` and `README.md` lead with `docker run` / `docker compose up -d`

## [0.1.0] — 2026-05-09

### Added
- Initial public release under AGPL-3.0
- Nuxt 4 SSR storefront (Vue 3, Nitro, Tailwind v3)
- Drizzle ORM + PostgreSQL 17 with pgvector
- Redis caching layer (sessions, rate-limit, distributed locks)
- Drizzle schema definitions for ~50 entities (catalog, cart, orders, FAQ, blog, CMS pages, marketplace, themes…)
- Admin hub (`/hub`) with CRM, PIM, OMS, CMS, BI views (back-office, alpha)
- Centaure AI integration points for autonomous content via OpenAI / Anthropic / Mistral providers
- Stripe checkout flow + payment intent creation
- White-label storefront layout with theme variables and tenant-overrideable assets
- Single-process monolith deploy: one `node .output/server/index.mjs` serves storefront, admin, API and SSR

### Documentation
- `README.md` with three-tier offer description (Community / Managed Standard / Managed Pro)
- `INSTALL.md` for development and production setup
- `ARCHITECTURE.md` rationale (monolith vs headless, why Nuxt, why Drizzle)
- `CONTRIBUTING.md` with conventional commits + DCO
- `SECURITY.md` policy with disclosure flow
- `CODE_OF_CONDUCT.md` (Contributor Covenant 2.1)
- `ROADMAP.md` with public 12-month plan

### Known limitations
- No bundled DB seed CLI yet — admin user must be inserted manually for the v0.1 line. A seed CLI is on the v0.2.0 roadmap.
- Multi-language storefront supports French and English by default; other locales need translation seeding.
- The Stripe / SystemPay payment integration is bundled but requires manual API key configuration.
- The Discord community channel is not yet open.

[Unreleased]: https://github.com/codemyshop/codemyshop/compare/v0.2.7...HEAD
[0.2.7]: https://github.com/codemyshop/codemyshop/releases/tag/v0.2.7
[0.2.6]: https://github.com/codemyshop/codemyshop/releases/tag/v0.2.6
[0.2.5]: https://github.com/codemyshop/codemyshop/releases/tag/v0.2.5
[0.2.4]: https://github.com/codemyshop/codemyshop/releases/tag/v0.2.4
[0.2.3]: https://github.com/codemyshop/codemyshop/releases/tag/v0.2.3
[0.2.2]: https://github.com/codemyshop/codemyshop/releases/tag/v0.2.2
[0.2.1]: https://github.com/codemyshop/codemyshop/releases/tag/v0.2.1
[0.2.0]: https://github.com/codemyshop/codemyshop/releases/tag/v0.2.0
[0.1.7]: https://github.com/codemyshop/codemyshop/releases/tag/v0.1.7
[0.1.6]: https://github.com/codemyshop/codemyshop/releases/tag/v0.1.6
[0.1.5]: https://github.com/codemyshop/codemyshop/releases/tag/v0.1.5
[0.1.4]: https://github.com/codemyshop/codemyshop/releases/tag/v0.1.4
[0.1.3]: https://github.com/codemyshop/codemyshop/releases/tag/v0.1.3
[0.1.2]: https://github.com/codemyshop/codemyshop/releases/tag/v0.1.2
[0.1.1]: https://github.com/codemyshop/codemyshop/releases/tag/v0.1.1
[0.1.0]: https://github.com/codemyshop/codemyshop/releases/tag/v0.1.0
