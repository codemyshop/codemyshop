# CodeMyShop

> Open-core PrestaShop-style modular Nuxt platform — European sovereignty e-commerce PaaS.

[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-blue.svg)](LICENSE)

## What is this?

CodeMyShop is the open-source community edition of a modular e-commerce platform built on **Nuxt 4 + Drizzle ORM + PostgreSQL**. It implements PrestaShop-style display/action/filter hooks adapted for a modern Vue 3 server-rendered stack.

This repo is a **snapshot** synchronized from a private monolith (`alexandre-carette-hub`) via `synedre/sync-codemyshop-oss.sh`. Public releases are tagged versions of the synchronized public tree — not commit-by-commit history.

## Architecture

The platform follows a **4-edition open-core** model:

| Edition | Distribution |
|---|---|
| `community` | This repo (AGPL-3.0), self-host or hosted Starter @ 10 €/mo |
| `enterprise` | Hosted-only (Growth / Pro / Custom) — not in this repo |
| `custom` | Bespoke per-tenant — not in this repo |
| `internal` | Place des Armes operations — never distributed |

See [`core/EDITIONS.md`](core/EDITIONS.md) for the technical edition mapping and pricing tiers.

## Status

This is **v0.0.1** — first public snapshot. Expect rough edges. The public repo bootstrap is in progress; many files are stubs awaiting the next sync.

## License

AGPL-3.0 — see [LICENSE](LICENSE). The `enterprise/` and `internal/` packs are NOT included in this repo and are governed by separate licenses.

## Links

- Marketing site: https://codemyshop.com
- Issues: https://github.com/codemyshop/codemyshop/issues
