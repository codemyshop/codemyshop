# Locale packs

Source of truth for storefront UI strings. Each `<locale>.yaml` file is
seeded into the `cs_translation` Postgres table by the `seed:translations`
Nitro task at install / deploy time.

## Files

- `fr.yaml` — French (default, primary source)
- `en.yaml` — English
- `de.yaml` — German *(not yet shipped — contribute via PR)*

## Format

Nested YAML namespaces; leaf values are strings with optional `{name}`
placeholders interpolated at render time.

```yaml
cart:
  loyalty:
    title: Programme fidélité
    points_balance: "{points} points disponibles"
```

Reference at runtime:

```vue
<template>
  <p>{{ t('cart.loyalty.title') }}</p>
  <p>{{ t('cart.loyalty.points_balance', { points: 42 }) }}</p>
</template>
<script setup lang="ts">
const { t } = useT()
</script>
```

## Conventions

- Keys are `lower_snake_case`, dotted by namespace (`feature.subfeature.label`).
- Keys are immutable contracts — rename = breaking change for translators.
  Prefer adding a new key + soft-deprecating the old one.
- Values may contain HTML entities and Unicode (`«&nbsp;»`, em-dash, etc.).
- For pluralization, use distinct keys (e.g. `points_one`, `points_other`)
  or keep the count out of the string and surround it with separate UI.

## Contributing a new language

1. Copy `fr.yaml` to `<your-locale>.yaml` (use BCP-47 codes: `de`, `pt-BR`, `zh-Hant`).
2. Translate values. Keep keys identical.
3. Open a PR. CI will validate the YAML structure matches the FR baseline.
4. After merge, the next deploy (or `pnpm seed:translations`) installs the
   pack into the `cs_translation` table — no code change needed.

## Seeding

The Nitro task `seed:translations` reads every `*.yaml` here and upserts
the rows into `cs_translation` (`{id_lang, key, translation, domain='oss'}`).
Idempotent: re-running on the same files is a no-op.

```bash
# Local dev
pnpm seed:translations

# Container (one-shot)
docker exec codemyshop-app pnpm seed:translations
```

## Tenant overrides

Tenants can ship a per-shop override pack at `clients/<tenant>/i18n/<locale>.yaml`.
Same key shape as this base — only put keys that DIVERGE from OSS, anything
absent falls through. Same `seed:translations` task picks them up and writes
them with `domain='tenant:<tenant>'`. The runtime API merges OSS + tenant on
read and the tenant value wins on collision.

```yaml
# clients/<tenant>/i18n/fr.yaml
product:
  add_to_cart: Ajouter au panier de gros
search:
  placeholder: Rechercher un produit (SKU, EAN, nom…)
```

## How the runtime reads it

`useT()` (`core/composables/useT.ts`) calls `/api/translations` which:
1. Reads `cs_translation` rows tagged `domain='oss'` for the active locale.
2. Reads rows tagged `domain='tenant:<clientId>'` for the current tenant.
3. Returns a merged dict (tenant wins on collision).

Caches in a Nuxt `useState` keyed by `(clientId, lang)`. Missing keys return
the key itself in dev mode (with a console warning) and an empty string in
prod.

The `domain` column lets multiple consumers coexist:
- `domain='oss'` — keys seeded from these YAML files (this directory)
- `domain='tenant:<codename>'` — keys from `clients/<codename>/i18n/*.yaml`
- `domain='hub'` — Hub admin UI strings (managed via `useHubT()`)
- `domain='module:<slug>'` — module-specific strings (future)
