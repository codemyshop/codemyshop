# Roadmap

Public 12-month roadmap for CodeMyShop. We update this quarterly.

> Conventions: ✅ done, 🚧 in progress, 📅 planned, 💭 considering.

---

## H1 2026 (mai – octobre 2026)

### Foundation

- ✅ Nuxt 4 + Drizzle PG + Redis monolith stable in production (3 internal tenants)
- ✅ AGPL-3.0 publication + governance setup
- 🚧 First external community installations (target: 3 documented installs by Q4 2026)
- 🚧 Discord community channel
- 📅 Stripe products & prices for the three tiers (Community / Standard / Pro)
- 📅 Ansible playbook hardening (UFW, fail2ban, daily backup to S3)

### Storefront

- ✅ SSR product pages with structured JSON-LD
- ✅ Cart, checkout, payment via SystemPay (CB) and Stripe
- ✅ Customer account self-service (orders, invoices, addresses)
- 📅 Wishlists and product comparison
- 📅 B2B quote-to-cart workflow
- 💭 Live chat module (Crisp, Tawk integration)

### Admin hub

- ✅ Product CRUD with i18n, variants, multipack pricing
- ✅ Category CRUD with polymorphic FAQ
- ✅ Order management with status workflow
- ✅ CRM with leads, customers, B2B accounts
- ✅ Email templates with i18n DB-first
- 📅 Marketing automation (cart recovery, post-purchase, win-back)
- 📅 Vendor / supplier management
- 📅 Inventory transfers between warehouses

### AI (Centaure)

- ✅ SEO article generation
- ✅ Product description rewriting
- ✅ Category cover image generation
- ✅ FAQ enrichment
- 📅 Multi-provider routing (cost optimization across OpenAI / Anthropic / Mistral)
- 📅 Embedding-based semantic search on the storefront
- 💭 Image generation for marketing assets (DALL-E / Midjourney API)

---

## H2 2026 (novembre 2026 – avril 2027)

### Community growth

- 📅 100+ GitHub stars
- 📅 First external pull request accepted
- 📅 Maintainer contributors recruited (1-2 outside the core team)
- 📅 Quarterly newsletter

### Commercial launch (Managed plans)

- 📅 First three Managed customers signed
- 📅 Customer onboarding playbook
- 📅 Per-customer SLA dashboards

### Storefront

- 📅 Multi-currency
- 📅 Multi-language (DE, ES, IT in addition to FR / EN)
- 📅 Native PWA install banner
- 💭 AMP fallback for product pages

### Admin hub

- 📅 Real-time dashboard (orders / cart abandonments)
- 📅 A/B testing module for landing pages
- 📅 ERP / accounting connector framework (Pennylane, Sage)
- 📅 Native Matomo integration in BI view

### AI

- 📅 Centaure agent orchestration (planning, decomposition)
- 📅 Self-improvement via feedback loops
- 💭 Voice interface for hub (vocal commands)

---

## H1 2027

### Vertical specialization

- 📅 Verticale `food.codemyshop.com` — agroalimentaire B2B (lots, DLC, poids variable, grilles tarifaires multi-niveaux, Quick Order)
- 💭 Verticale `vape.codemyshop.com` — vape / tobacco compliance
- 💭 Verticale `bike.codemyshop.com` — sport / gear

### Scale

- 📅 Kubernetes deploy option for high-volume stores
- 📅 Read-replica routing for analytics queries
- 📅 Sub-tenant model for marketplaces

### Compliance

- 📅 GDPR consent management certification
- 📅 PCI-DSS scope minimization (tokenization)
- 💭 ISO 27001 path

---

## What we won't do (anti-roadmap)

We deliberately reject some features that complicate the platform without proportional benefit:

- ❌ **Headless architecture** — the monolith is a feature, not a limitation. See [ARCHITECTURE.md](ARCHITECTURE.md).
- ❌ **Plugin marketplace with binary distribution** — modules ship via PRs into the core. No App Store, no quality lottery.
- ❌ **Vendor-specific SaaS lock-in** — every dependency is replaceable. No tight coupling to AWS, Vercel, Cloudflare, etc.
- ❌ **Closed-source paid modules** — premium features are delivered via the Managed plans (service tier), not via paywalled code.
- ❌ **Auto-upgrades that change DB schema without consent** — every breaking change is announced in CHANGELOG and gated behind a manual `npm run db:migrate`.

## How to influence the roadmap

- Open a [GitHub Discussion](https://github.com/codemyshop/codemyshop/discussions) with your use case
- 👍 reactions on existing discussions / issues weight prioritization
- Sponsor specific features via the Managed Pro tier (4 days/month of dev included)
- For commercial customers: feature requests via your account architect
