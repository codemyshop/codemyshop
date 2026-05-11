# Naming convention — full reference

CodeMyShop applies a strict naming policy across tables, modules, files, and
identifiers. Consistency is enforced because the multi-tenant model and the
DB-first doctrine break silently when names diverge.

> Quick summary lives in [CONTRIBUTING.md § Naming convention](../CONTRIBUTING.md#naming-convention). This document is the complete reference, with the **why** behind each rule.

## Table of contents

1. [Database tables (`cs_*`)](#1-database-tables-cs_)
2. [i18n tables (`cs_*_lang`)](#2-i18n-tables-cs__lang)
3. [Polymorphic associations](#3-polymorphic-associations)
4. [Pure N-N association tables](#4-pure-n-n-association-tables)
5. [Modules (`core/modules/*`)](#5-modules-coremodules)
6. [Drizzle schema files (`schema-pg/*.ts`)](#6-drizzle-schema-files-schema-pgts)
7. [Façade pattern](#7-façade-pattern)
8. [Source files (kebab-case)](#8-source-files-kebab-case)
9. [No JSON content in DB columns](#9-no-json-content-in-db-columns)
10. [Anti-duplication rule](#10-anti-duplication-rule)
11. [Validation: `cs_audit_schema`](#11-validation-cs_audit_schema)
12. [Migration history](#12-migration-history)

---

## 1. Database tables (`cs_*`)

| Rule | Example | Anti-example |
|---|---|---|
| Prefix `cs_` mandatory on every custom table | `cs_theme`, `cs_homepage_section` | `theme`, `ac_theme`, `ps_ac_theme` |
| Singular noun, never plural | `cs_faq`, `cs_quote` | `cs_faqs`, `cs_quotes` |
| One module = one parent entity = one table `cs_<entity>` (+ optional `_lang`) | `cs_quote_request` | `cs_quote_request_main` + `cs_quote_request_extra` |
| Polymorphism via `parent_type VARCHAR(32)` + `parent_id INT UNSIGNED` (see § 3) | one `cs_faq` polymorphic | `cs_cms_faq` + `cs_category_faq` + `cs_product_faq` |

**Why singular?** Aligned on PrestaShop-native (`ps_product`, not `ps_products`). Mixed plural/singular makes joins confusing (`cs_faqs.id_faq = cs_questions.id_faq`?).

---

## 2. i18n tables (`cs_<entity>_lang`)

| Rule | Example | Anti-example |
|---|---|---|
| Suffix is exactly `_lang` | `cs_faq_lang`, `cs_quote_lang` | `cs_faq_translation`, `cs_faq_i18n`, `cs_faq_locale` |
| Composite primary key `(id_<entity>, id_lang)` — no `auto_increment` | `PRIMARY KEY (id_faq, id_lang)` | `id_translation INT auto_increment` |
| Multi-shop: extended PK `(id_<entity>, id_lang, id_shop)` — never a separate `_shop_lang` table | `PRIMARY KEY (id_faq, id_lang, id_shop)` | `cs_faq_shop_lang` |
| **Strict column separation** | parent: FK, flags, dates, enums. `_lang`: `title`, `description`, `meta_*`, all user-visible text | parent contains `title VARCHAR(255)` "for fallback" |

**Why?** Fallback columns in the parent table create a "double source" that the codebase eventually drifts on. The `_lang` table is the only source of user-visible translatable text — period.

**Zero hardcoded user-visible strings in code.** Every string visible to a visitor must go through `t('domain.key')` (front-side, reads `ps_translation`) or via an email/PDF template slug (`cs_email_template_lang`).

---

## 3. Polymorphic associations

When the same feature applies to multiple parent entities (e.g. FAQ for CMS pages **and** categories **and** products), use **one** polymorphic table — never one per parent.

```sql
CREATE TABLE cs_faq (
  id_faq         SERIAL PRIMARY KEY,
  parent_type    VARCHAR(32) NOT NULL,  -- 'cms' | 'category' | 'product'
  parent_id      INT NOT NULL,
  position       INT DEFAULT 0,
  active         BOOLEAN DEFAULT TRUE,
  date_add       TIMESTAMPTZ DEFAULT NOW(),
  date_upd       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE cs_faq_lang (
  id_faq    INT NOT NULL REFERENCES cs_faq(id_faq) ON DELETE CASCADE,
  id_lang   INT NOT NULL,
  question  TEXT NOT NULL,
  answer    TEXT NOT NULL,
  PRIMARY KEY (id_faq, id_lang)
);
```

### Exception: the `_extra` pattern

When a module **extends 1:1** a PrestaShop-native entity with additional columns, use `cs_<ps_entity>_extra` (+ optional `_lang`). PK is `id_<ps_entity>`, also FK to `ps_<ps_entity>.id_<ps_entity>`. Examples: `cs_customer_extra`, `cs_product_extra` + `cs_product_extra_lang`, `cs_employee_extra`, `cs_wishlist_extra`. No polymorphism here (one PS entity targeted).

---

## 4. Pure N-N association tables

For a many-to-many association with no payload of its own:

| Rule | Example | Anti-example |
|---|---|---|
| Name is `cs_<a>_<b>` in alphabetical order | `cs_category_cms` (not `cs_cms_category`) | `cs_categories_cms_asso`, `cs_cms_to_category` |
| No `_asso` / `_link` / `_pivot` suffix | `cs_category_cms` | `cs_category_cms_asso` |
| No `_lang` table — N-N tables carry no user-visible content | composite PK on the two FKs | `cs_category_cms_lang` |

---

## 5. Modules (`core/modules/*`)

| Rule | Example | Anti-example |
|---|---|---|
| **Folder name = entity in kebab-case, no prefix** | `core/modules/bank/`, `core/modules/quote-request/` | `core/modules/ac_bank/`, `core/modules/cs_bank/` |
| One folder = one business domain | `core/modules/invoice/`, `core/modules/quote/` (separate) | `core/modules/invoicing/` (mixing both) |
| Underscores allowed if needed for clarity | `core/modules/category-cms/` | `core/modules/categorycms/` |
| The module's primary table follows § 1: `cs_<entity>` | `core/modules/faq/` owns `cs_faq` | `core/modules/faq/` owns `cs_questions` |

**History.** Modules used to be prefixed `ac_` (e.g. `core/modules/ac_bank/`) when CodeMyShop was a PrestaShop extension. The prefix was dropped in v0.2.0 — folder names now match the table prefix only at the **table** level, not the directory.

---

## 6. Drizzle schema files (`schema-pg/*.ts`)

The source of truth for any `cs_<entity>` table is `core/server/db/schema-pg/<entity>.ts` (Drizzle PG).

| Rule | Example |
|---|---|
| One file per entity in kebab-case | `theme.ts` defines `cs_theme` and `cs_theme_lang` |
| Parent + `_lang` cohabit in the same file | `homepage-block.ts` exports both `csHomepageBlock` and `csHomepageBlockLang` |
| Catch-all entities are forbidden — split by domain | `quote.ts` (≠ `quote-request.ts`, ≠ `subscription.ts`, ≠ `invoice.ts`) |

Adding a column = (a) edit `schema-pg/<entity>.ts`, (b) `ALTER TABLE` on the live PG, (c) optional SQL migration in `core/server/db/migrations/`.

---

## 7. Façade pattern

Each module exposes **one** entry point — the façade — that is the only legal way to read/write the module's tables.

```
core/modules/<domain>/server/utils/<domain>.ts   ← THE façade
                       └── reads/writes cs_<domain> + cs_<domain>_lang
                       └── exports loadX(), createX(), updateX(), deleteX()

core/server/api/<domain>/*.post.ts                ← API routes
                       └── import { createX } from '~/modules/<domain>/server/utils/<domain>'
                       └── never SELECT/INSERT directly
```

**Anti-pattern**: a Vue component or another module's façade running raw SQL on `cs_<domain>`. Always go through the façade.

---

## 8. Source files (kebab-case)

| Type | Convention | Example |
|---|---|---|
| TypeScript files | kebab-case | `ae-client.ts`, `monthly-report.ts` |
| Vue components | PascalCase (Nuxt convention) | `HomeHero.vue`, `CategoryCard.vue` |
| API routes | kebab-case + Nuxt suffix | `add-to-cart.post.ts`, `get-product.get.ts` |
| Schemas | kebab-case = table entity | `homepage-block.ts` for `cs_homepage_block` |
| Tests | suffix `.spec.ts` next to the file | `bank.ts` + `bank.spec.ts` |

---

## 9. No JSON content in DB columns

Every piece of content lives in normalized columns. **Forbidden columns**:
- `payload_json`
- `content_i18n` (any JSON `{en, fr, de}` shape)
- `labels_json`
- `items_json`
- `blocks_json`

→ For i18n: use `cs_<entity>_lang`.
→ For lists / N-N: use a child table (`cs_<entity>_<child>`).

**Sole tolerance**: ephemeral technical payloads (webhook bodies, error logs, session state). Document them with a `COMMENT ON COLUMN`.

**Why?** JSON content blocks are write-friendly but read-hostile: you can't index the inside, you can't run SQL aggregates, you can't migrate the structure without parsing. Normalized columns scale; JSON blobs accrete.

---

## 10. Anti-duplication rule

**1 feature = 1 module = 1 parent table.**

Before creating a new module:
1. `grep -r "cs_<feature>" core/server/db/schema-pg/`
2. Check `core/modules/` for an existing module that could absorb the feature
3. If the feature already exists under another name → unify, never duplicate

A polymorphic feature applied to multiple entities (CMS + category + product) is **one** table `cs_<feature>` + `parent_type`/`parent_id`, not three sibling tables.

---

## 11. Validation: `cs_audit_schema`

A daily cron (`cs_audit_schema`, runs at 04:15 UTC) scans `information_schema` and flags violations:

- Tables without `cs_` prefix
- Plural table names
- Forbidden i18n suffixes (`_translation`, `_locale`, `_i18n`, …)
- i18n-typical columns (`title`, `description`, `question`, …) in a parent table without a sibling `_lang`
- `*_json` columns matching i18n shapes or business-data lists
- Functional duplicates (≥ 80 % column overlap between two `cs_*` tables)
- `cs_*` tables without an owning `core/server/db/schema-pg/<entity>.ts`

Each violation creates a tracked item in the team's backlog with `priority='P0'` — work pauses until corrected.

This audit is part of the OSS distribution from v0.3.0+. Currently it lives in the private monolith and will be ported with the `seed:tenant` script.

---

## 12. Migration history

The current `cs_*` prefix is the result of a single breaking rename in v0.2.0:

| Version | Prefix | Reason |
|---|---|---|
| v0.1.x | `ps_ac_*` | Legacy from when CodeMyShop was a PrestaShop extension named "ac" |
| v0.2.0 | `cs_*` | Rebrand to CodeMyShop; remove confusion with PrestaShop-native `ps_*` tables |

The full migration story (rename SQL, automated rewrites in TS, what broke, what didn't) is documented in [SCHEMA_HISTORY.md](SCHEMA_HISTORY.md).

If you're upgrading a v0.1.x install, the v0.2.0 release notes provide a migration script that renames every `ps_ac_*` table to its `cs_*` equivalent in one transaction.
