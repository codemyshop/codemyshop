# Schema history — `cs_*` (since v0.2.0), formerly `ps_ac_*`

If you've poked around `core/server/db/schema-pg/` or run `\dt` against
a fresh CodeMyShop database, you'll see every project-owned table is
named `cs_<entity>` (catalog, marketplace, blog, FAQ, hero blocks…).
This document explains where the prefix came from, why it took the
shape it did, and what's still legacy.

## Where the prefix comes from

CodeMyShop started life inside an internal product called **AC Hub**
(Alexandre Carette's commerce platform), built as a thick set of
modules layered on top of **PrestaShop**. PrestaShop's native tables
all use the `ps_` prefix. To distinguish our own tables from the ones
PrestaShop owns and migrates, the team adopted `ps_ac_<entity>` —
*PrestaShop + AC* — for everything written in-house.

Over 2025–2026 the runtime was rewritten in TypeScript on Nuxt 4 +
Drizzle, PrestaShop's PHP runtime was decommissioned, and the project
was renamed CodeMyShop and open-sourced under AGPL-3.0. The historical
schema names came along for the ride at first — and were renamed in
**v0.2.0** to drop the AC-Hub legacy.

## What changed in v0.2.0

Every `ps_ac_<entity>` was renamed to `cs_<entity>`:

```
ps_ac_faq           →  cs_faq
ps_ac_faq_lang      →  cs_faq_lang
ps_ac_quote         →  cs_quote
ps_ac_marketplace   →  cs_marketplace
…  (≈ 50 tables)
```

Concretely, this affected the v0.2.0 release:

- ~50 Drizzle pgTable definitions in `core/server/db/schema-pg/*.ts`
- 230 SQL identifiers in `core/server/db/migrations/0000_initial.sql`
- 281 source files touched in total (raw SQL strings, type aliases,
  any inline reference to a custom table by name)

The PrestaShop-derived tables (`ps_product`, `ps_orders`, `ps_customer`,
`ps_cms`, etc.) **kept their `ps_*` prefix**: those are still ETL
targets and many queries still treat them as a contract with an
external PrestaShop install. Phasing them out is the v0.4.0 work
(see below).

## Upgrade path from v0.1.x

A v0.1.x → v0.2.0 in-place upgrade is **not** supported as a one-liner.
Renaming ~50 tables that may already hold rows requires a coordinated
`ALTER TABLE … RENAME` migration plus careful timing around any
running app process. We have not written that migration yet — if you
are running a production v0.1.x install, **stay on v0.1.x** until we
publish it.

For fresh installs, v0.2.0 is the cleanest path: `npm run db:migrate`
provisions the new `cs_*` schema directly, no rename involved.

## Still on the roadmap

1. **`v0.3.0`** — finish the PrestaShop schema migration as a proper
   versioned `0001_ps_native.sql` migration (today, `seed-demo.mjs`
   creates the native PS tables on the fly with
   `CREATE TABLE IF NOT EXISTS`). DDL becomes a first-class citizen
   instead of a script artefact.
2. **`v0.4.0`** — drop the `ps_` prefix on tables we now own
   end-to-end (catalog, orders, customers). Tables that mirror an
   actual external PrestaShop install stay `ps_*`.
3. **Migration helper** — a one-shot rename script for v0.1.x
   operators who want to upgrade without losing data. No date yet;
   ping us in Discussions if you need it sooner.

## What you should do

- **For new installs**: nothing — `cs_*` is the default.
- **For new modules**: use `cs_<entity>` for every project-owned table.
- **For raw SQL**: never hardcode the prefix in user-facing strings
  (URLs, page titles, JSON fields). Only the schema layer should know.

## See also

- [`ROADMAP.md`](../ROADMAP.md) — the public 12-month plan
- [`ARCHITECTURE.md`](../ARCHITECTURE.md) — why monolith, why Nuxt, why Drizzle
- [`CHANGELOG.md`](../CHANGELOG.md) — release notes (v0.2.0 entry has the rename details)
