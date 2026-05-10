<p align="center">
  <img src="logo-cms-512.png" alt="CodeMyShop logo" width="180" />
</p>

# CodeMyShop

> **Open-source e-commerce PaaS for European sovereignty.** 100% TypeScript stack: Nuxt 4 + Drizzle + PostgreSQL. AGPL-3.0. 0% commission. Built in France in 2026.

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![Built with Nuxt 4](https://img.shields.io/badge/Nuxt-4-00DC82)](https://nuxt.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-336791)](https://www.postgresql.org)
[![Status: alpha](https://img.shields.io/badge/Status-alpha-orange)]()

## Why CodeMyShop

- **Sovereign by design** — your code, your data, your server. France-based hosting or self-host. No CLOUD Act exposure.
- **Modern unified stack** — Nuxt 4 SSR + Drizzle ORM + PostgreSQL with pgvector for AI + Redis cache + nginx. One process, atomic deploys.
- **Open-source AGPL-3.0** — auditable, modifiable, forkable. No vendor lock-in. The AGPL clause protects the community from predatory SaaS forks.
- **Zero commission** — vs 1.5–2 % on Shopify. On €750k of yearly GMV, that's €15k saved.
- **Built-in AI** — autonomous SEO content generation, enriched product sheets, structured data for LLM visibility.

## Status

**Alpha — public preview.** Core runtime stable in production on 3 internal tenants. We're publishing the source code under AGPL-3.0 to invite community installations and feedback before launching the Managed plans (Q1 2027).

If you install it and have a working production site → please open an issue or DM. We want 2-3 documented external installations to confirm the install path works end-to-end.

## Three tiers

| | Community | Managed Standard | Managed Pro |
|---|---|---|---|
| **Price** | **Free** | **€800/month** + €5k setup | **€1500–2500/month** + €15k setup |
| **Hosting** | Self-host | Sovereign French VPS included | Dedicated VPS + 24/7 SLA |
| **Setup** | DIY | We handle it | We handle it + strategic onboarding |
| **Support** | GitHub issues | Email < 48 h business | Direct architect + 4 days/month dev included |
| **Updates** | Manual | Express security < 48 h | Express + custom dev |

→ See [codemyshop.com](https://codemyshop.com) for Managed plans.

## Quick start (Community, self-host)

Prerequisites: Node 22+, PostgreSQL 17+, Redis 7+, Docker recommended.

```bash
git clone https://github.com/codemyshop/codemyshop.git
cd codemyshop
cp .env.example .env  # edit DB credentials
npm install
npm run dev
```

→ See [INSTALL.md](INSTALL.md) for the production setup (Ansible playbook, VPS provisioning, SSL, monitoring).

## Architecture

A single Node.js process (Nuxt 4 Nitro) handles:

- product catalog (PostgreSQL via Drizzle ORM)
- storefront experience (Vue 3 SSR)
- admin hub / back-office
- Centaure AI (autonomous SEO content via OpenAI / Anthropic / Mistral)

No microservices, no API bridge between two systems: atomic deploy with a single `git push`.

→ See [ARCHITECTURE.md](ARCHITECTURE.md) for the technical rationale (why monolith over headless, why Nuxt over Next, why Drizzle over Prisma).

## Stack

| Layer | Tech | Why |
|-------|------|-----|
| Runtime | Nuxt 4 (Nitro server, Vue 3 SSR) | Single TS codebase for storefront + admin + API |
| ORM | Drizzle ORM | TypeScript-native, no codegen, easy raw SQL escape hatch |
| Database | PostgreSQL 17 + pgvector | Mature, sovereign, vector embeddings for AI |
| Cache | Redis 7 | Sessions, rate limit, ephemeral state |
| Web server | nginx | Reverse proxy, SSL, static assets, rate limit |
| AI providers | OpenAI / Anthropic / Mistral | Pluggable, configured via env |
| Analytics | Matomo (self-hosted) | First-party data, GDPR-friendly |
| Process manager | PM2 | Graceful reload, monitoring, log aggregation |

## Community

- **Discord** — coming soon
- **GitHub Discussions** — for design questions and feedback
- **GitHub Issues** — for bugs and feature requests
- **Twitter/X** — [@codemyshop](https://twitter.com/codemyshop) (coming soon)

## Contributing

We welcome PRs. See [CONTRIBUTING.md](CONTRIBUTING.md). Code reviews are mandatory, CI must pass, and we use [Conventional Commits](https://www.conventionalcommits.org/).

For security issues, please follow [SECURITY.md](SECURITY.md) — do **not** open a public issue.

## License

**AGPL-3.0** — see [LICENSE](LICENSE).

> The AGPL clause requires SaaS forks to publish their modifications under AGPL too. It protects the commons against predatory forks (the MongoDB / Elastic / Plausible model). Private and self-hosted use stays unrestricted.

## Trademark

**CodeMyShop®** is a registered trademark at the EUIPO. You can fork and self-host freely, but a fork cannot present itself under the "CodeMyShop" name without prior written authorization.

## Acknowledgments

Built in France in 2026 with [Claude Code](https://claude.com/claude-code) by Alexandre Carette and his Synedre of AI agents. Inspired by the open-source ethos of MongoDB, Plausible, n8n, and Supabase.

---

🇫🇷 *Lire ce README en français : [README.fr.md](README.fr.md)* (à venir)
