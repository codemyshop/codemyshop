# CodeMyShop — Editions

CodeMyShop is **open-core**. The free **Community** edition is a complete, production-ready commerce platform — no crippled trial, no feature gating on essentials. The paid hosted tiers (**Starter**, **Growth**, **Pro**, **Custom**) cover increasingly demanding shops, from solo founder to multi-region enterprise group.

This page is the public, authoritative split. If a feature is listed under a paid tier, it is **intentionally** not in the Community edition.

## At a glance

| | **Community** | **Starter** | **Growth** | **Pro** | **Custom** |
|---|:---:|:---:|:---:|:---:|:---:|
| **Price** | Free (AGPL-3.0) | **10 €/mo** | **80 €/mo** | **400 €/mo** | **Talk to us** |
| **Target** | Self-hosters, devs, agencies | Solo founders, SMBs starting out | SMBs growing, 250 k-500 k€ revenue | SMBs scaling, 500 k-1.5 M€ revenue | Mid-market, regulated verticals, multi-shop groups, white-label |
| **Hosting** | Self-host | Hosted by CodeMyShop (sovereign EU) | Hosted by CodeMyShop (sovereign EU) | Hosted by CodeMyShop (sovereign EU) | Custom (multi-region, dedicated cluster, BYOC option) |
| **Support** | GitHub | Community (Discord) | Email 48h | Email 24h | 4h business + 24/7 on-call + SLA 99.9% |
| **Setup** | Self-serve docs | Self-serve onboarding (~15 min) | Self-serve onboarding | Guided onboarding | White-glove onboarding |
| **cs_payment slice** | 0 % (you bring your own PSP) | 0.25 % (Stripe Connect) | 0.25 % (Stripe Connect) | 0.25 % (Stripe Connect) | Configurable per contract |

**Ratios** : 0 → 10 → 80 → 400 → quote. Smooth gradient aligned with Shopify, BigCommerce, Squarespace standards. Pattern Linear/Notion : 4 flat SKUs + 1 "Talk to us".

**Custom** is on quote and covers the cases that exceed standard Pro scope :
- **Cercle Elumni** community (peer network, exclusive events)
- **Regulated verticals** (food, vape, jewelry, fashion)
- **Banking & Compliance pack** (PSD2/Powens, URSSAF automation, fiscal audit)
- **Multi-shop / multi-brand groups** (≥ 2 shops, franchise networks)
- **Multi-region** with data residency requirements per jurisdiction
- **White-label / OEM** (you resell CodeMyShop under your brand)
- **Recurring custom development** (>5 days/year of tenant-specific dev)
- **Premium SLA** (99.9%, 4h response, 24/7 on-call)
- **Advanced compliance** (SSO / SAML / SCIM, ISO 27001 attestation, independent audit)
- **Heavy migrations** (>50k SKU ETL, custom legacy system migration)

[Talk to us →](https://codemyshop.com/contact)

### What's included — organized by pack

The hosted tiers progressively unlock packs by domain. All packs are bundled in their tier price; the structure is here to clarify what you get at each level.

| Pack | Starter | Growth | Pro | Custom |
|------|:---:|:---:|:---:|:---:|
| 🤖 **AI Pack lite** (cover gen, basic rewriting) | — | ✅ | ✅ | ✅ |
| 🤖 **AI Pack complete** (Brand DNA, full content rewriting) | — | — | ✅ | ✅ |
| 📊 **Data Pack** (audit logs, telemetry, market intelligence) | — | — | ✅ | ✅ |
| 🔍 **SEO Pack** (GSC console, AI recommendations, sitemap, JSON-LD) | — | — | ✅ | ✅ |
| 🤝 **Cercle Elumni** community network | — | — | — | ✅ |
| 🏦 **Banking & Compliance Pack** (PSD2/Powens, URSSAF, audit fiscal) | — | — | — | ✅ |
| 🍔 **Food Vertical Pack** (DLC, lot tracking, MDM food, catchweight) | — | — | — | ✅ |
| 💨 **Vape Vertical Pack** (age gate, EU TPD compliance) *(wireframe)* | — | — | — | ✅ |
| 👗 **Fashion Vertical Pack** (variants, lookbook, size guide) *(roadmap)* | — | — | — | ✅ |
| 💍 **Jewelry Vertical Pack** (engraving, certification, multi-currency) *(roadmap)* | — | — | — | ✅ |

## Full capability matrix

| Capability | Community | Starter | Growth | Pro | Custom |
|---|:---:|:---:|:---:|:---:|:---:|
| **Commerce core** | | | | | |
| Catalog, cart, checkout, customer accounts | ✅ | ✅ | ✅ | ✅ | ✅ |
| B2B workflows (quote requests, quotes, invoices, fast reorder) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Subscriptions | ✅ | ✅ | ✅ | ✅ | ✅ |
| Multi-tenant runtime (siloed DB-per-tenant + shared codebase) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Standard payment integrations (SystemPay, etc.) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Multi-language (PS-native `ps_translation`) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Standard shipping & freight rules | ✅ | ✅ | ✅ | ✅ | ✅ |
| Wishlist, FAQ (polymorphic), redirects, attachments | ✅ | ✅ | ✅ | ✅ | ✅ |
| Theme system & homepage builder | ✅ | ✅ | ✅ | ✅ | ✅ |
| Headless contact forms | ✅ | ✅ | ✅ | ✅ | ✅ |
| **cs_payment** | | | | | |
| cs_payment Stripe Connect / Mollie / SystemPay adapters (env-driven) | ✅ | ✅ | ✅ | ✅ | ✅ |
| cs_payment platform fee 0.25 % activated | — | ✅ | ✅ | ✅ | configurable |
| **Hosting** | | | | | |
| Self-hosted | ✅ | — | — | — | — |
| Hosted in EU (sovereign cloud) | — | ✅ shared subdomain | ✅ custom domain | ✅ custom domain | ✅ multi-region |
| Custom domain | — | — | ✅ | ✅ | ✅ |
| Backup retention | best-effort | 7 days | 30 days | 30 days | 90 days + offsite |
| **AI Pack** | | | | | |
| AI category & product cover generation | — | — | ✅ lite | ✅ complete | ✅ |
| AI content rewriting (categories / products / blog) | — | — | basic | full | full |
| Brand DNA assistant | — | — | — | ✅ | ✅ |
| **Data Pack** | | | | | |
| Schema / dependency / drift audit logs | — | — | — | ✅ | ✅ |
| Telemetry & observability | — | — | — | ✅ | ✅ |
| Market intelligence (competitor watch, brand watch) | — | — | — | ✅ | ✅ |
| Atlas market data (curated B2B fiches) | — | — | — | ✅ | ✅ |
| **SEO Pack** | | | | | |
| SEO console (GSC integration + AI recommendations) | — | — | — | ✅ | ✅ |
| Advanced sitemap, structured data, redirect intelligence | — | — | — | ✅ | ✅ |
| **Cercle Elumni** | | | | | |
| Peer network access (founders & operators) | — | — | — | — | ✅ |
| Exclusive events & masterminds | — | — | — | — | ✅ |
| **Banking & Compliance Pack** | | | | | |
| Banking integration (PSD2 / Powens / French banks) | — | — | — | — | ✅ |
| URSSAF automation (FR social charges) | — | — | — | — | ✅ |
| Fiscal audit & smart documents (KYC, contracts) | — | — | — | — | ✅ |
| **Vertical Packs** | | | | | |
| 🍔 Food Vertical Pack (DLC, lot, MDM food, catchweight) | — | — | — | — | ✅ |
| 💨 Vape Vertical Pack (age gate, EU TPD compliance) *(wireframe)* | — | — | — | — | ✅ |
| 👗 Fashion Vertical Pack *(roadmap)* | — | — | — | — | ✅ |
| 💍 Jewelry Vertical Pack *(roadmap)* | — | — | — | — | ✅ |
| **Productivity (lite-CRM, integrations)** | | | | | |
| Lite-CRM (smart leads, projects, orders) | — | — | basic | ✅ | ✅ |
| Loyalty + referral programs | — | — | — | ✅ | ✅ |
| Inbox email integration (IMAP/SMTP) | — | — | — | ✅ | ✅ |
| Calendar / appointment booking | — | — | — | ✅ | ✅ |
| Auto-publish to social channels | — | — | — | ✅ | ✅ |
| WhatsApp Business integration | — | — | — | ✅ | ✅ |
| Blog comments moderation | — | — | ✅ | ✅ | ✅ |
| **Support & SLA** | | | | | |
| Support response | community (GitHub) | community (Discord) | email 48h | email 24h | 4h business + 24/7 on-call |
| SLA | best-effort | best-effort | best-effort | best-effort | 99.5% to 99.9% |
| Onboarding | self-serve docs | self-service (15 min) | self-service | guided | white-glove |
| **Custom-only** | | | | | |
| SSO / SAML / SCIM | — | — | — | — | ✅ |
| Multi-region replication | — | — | — | — | ✅ |
| ISO 27001 attestation | — | — | — | — | ✅ |
| Multi-shop / multi-brand groups | — | — | — | — | ✅ |
| White-label / OEM | — | — | — | — | ✅ |

## Enterprise features within Community modules

Some Community modules expose **base capabilities** for free, while their **advanced analytics or automation** are gated behind a paid feature flag. The module itself ships in Community (you can use it, extend it, fork it under AGPL-3.0); the gated features are unlocked only when the corresponding tier is active in your tenant.

This pattern lets us keep the Community edition genuinely useful (you have the data, you can list and act on it) while reserving the high-leverage analytics and automation for paying customers.

| Community module | Free capability | Gated feature | Tier required |
|---|---|---|---|
| `cs_quoterequest` (lead) | List, filter, qualify manually | Lead CAPA (cost per acquisition), Lead CA (revenue attribution), AI scoring, auto-routing | Pro |
| `cs_quote` (B2B quote) | Create, send PDF, basic templates | Multi-step approval, e-signature, escalation rules | Pro |
| `cs_savapi` (after-sales) | Create ticket, basic status | SLA tracking, auto-escalation, AI sentiment analysis | Pro |
| `cs_invoice` | Issue invoice, basic templates | Multi-currency reconciliation, dunning automation, exposure to `cs_bank` | Pro / Custom |
| `cs_subscription` | Create/cancel/update | Churn prediction (AI), upgrade/downgrade flows | Pro |
| `cs_loyalty` | Points balance, basic tiers | Predictive lifetime value, tier-jump nudges, AI offer personalization | Pro |
| `cs_categoryextra` / `cs_productextra` | Extend native PS data | AI auto-fill (descriptions, alt-text, schema.org), bulk image regeneration | Growth (lite) / Pro (full) |
| `cs_seoconsole` | Read GSC summary | Recommendation engine, click-through optimization, content brief | Pro |

All gated features above are **included in their respective tier** — no per-feature à-la-carte.

**Why this matters** : a competitor forking Community alone gets a working B2B commerce platform. They do **not** get the analytics that turn lead lists into revenue forecasting, the AI that turns ticket queues into sentiment dashboards, or the regulated vertical packs that handle DLC traceability or vape compliance. That's the moat.

**Implementation** : feature gating uses the `ps_cs_marketplace` table + `useFeatureFlag('lead.capa')` composable. In Community, the flag is always `false` and the UI renders an upgrade card with a CTA. In paid tiers, the flag is read from the tenant's active subscription.

## License

- **Community** is licensed under [AGPL-3.0-or-later](LICENSE). You can use it commercially, run it for clients, modify it. If you distribute a modified version (including as a SaaS), you must publish your modifications under the same license.
- **Starter / Growth / Pro / Custom** are commercial offerings hosted by CodeMyShop SAS. Source code of paid modules is available to paying customers under audit & customization clauses.

## Why open-core?

We believe the **only honest model** for a commerce platform like ours is :

1. **The base must be free, libre, and complete enough to ship a real shop.** No "demo trial" with crippled features. If you can run your shop on Community alone, do it.
2. **The hosted, productivity, and vertical layers are paid.** Running an AI cover generator costs money in API calls. Maintaining a banking integration requires regulatory contracts. Running an audited multi-tenant SaaS is operationally expensive. These costs can't be free, ever.
3. **What you pay for is operational leverage, not access to features.** You can self-host Community forever. Most customers eventually convert to a hosted tier because running production e-commerce at scale is exhausting — not because we gate basic features.

## Contributing back

If you build something on Community that you think belongs upstream — a new payment provider, a UX improvement, a translation, a vertical adapter — we welcome contributions. See `CONTRIBUTING.md`.

If you build a vertical pack for an industry we don't yet cover (automotive, B2B services, professional tools), we'd love to hear from you. We can either :
- Merge your module into Community if it's broadly useful
- Co-publish it as a Custom vertical pack with revenue share
- Reference your work in the ecosystem registry

## How to evaluate

1. **Try Community.** `docker compose up`, follow the [getting started](README.md#quick-start). Half-day install, you'll know if the stack fits.
2. **Try Starter (10 €/mo).** Zero setup, hosted by us in 15 minutes. Test on real merchant data, see if the operational leverage justifies the move from self-host.
3. **If you scale**, upgrade to Growth (custom domain, AI lite) or Pro (full AI/Data/SEO + dashboard premium) — both self-serve.
4. **If you're in food, vape, jewelry, or any regulated vertical**, or if you need Cercle / banking / SLA / multi-shop, **talk to us about Custom**.

---

> Last updated: 2026-05-10. This document is the public counterpart of the internal `MODULES_EDITION.md`. If you spot a discrepancy or believe a feature should be repositioned, open a discussion.
