/**
 * CodeMyShop Core — Nuxt Layer de base.
 *
 * This layer contains ALL shared code across tenants:
 * composables, components, layouts, server/, plugins, assets, middleware.
 *
 * Clients extend it via: extends: ['../../core']
 *
 * RULE: All business logic, PrestaShop logic, or generic UI goes here.
 * Only tenant-specific pages and overrides go in clients/[id].
 */
import { resolve } from 'node:path'
const __layerDir = resolve(import.meta.dirname ?? __dirname)

export default defineNuxtConfig({
  // Pas de compatibilityDate ici — le client le définit

  // Nuxt 4 : active les défauts du nouveau moteur (Nitro 3, structure dossier,
  // useAsyncData signatures). Bump package via nuxt@^4.x (2026-04-23).
  future: {
    compatibilityVersion: 4,
  },

  // CICATRICE 2026-05-04 : `inlineStyles: true` (commit 914a31c8) cassait la prod.
  // Effet attendu : inliner Tailwind global dans le <head> SSR pour gagner FCP.
  // Effet réel : @nuxtjs/tailwindcss + Nuxt 4 → Tailwind base/utilities droppés
  // entièrement du build (entry.css = 122 bytes, 0 utility, 0 --tw-* var).
  // Site sans CSS pendant ~11 jours. Repassage à `false` (default Nuxt 4) : entry.css
  // reprend ~30 KB de Tailwind, render-blocking mais site visible.
  features: {
    inlineStyles: false,
  },

  modules: [
    '@nuxtjs/tailwindcss',
    '@nuxt/image',
    '@nuxt/fonts',
    '@nuxt/scripts',
    resolve(__layerDir, 'modules/i18n-routes'),
  ],

  // @nuxt/fonts — self-host au build, zéro requête bloquante vers googleapis.
  // Auto-detection par scan du CSS : chaque tenant déclare sa font-family via
  // --font-family CSS var (cf clients/<tenant>/assets/theme-vars.css) et le
  // module génère uniquement les @font-face nécessaires. Déclarer families
  // explicitement ici générait ~84 @font-face (6 familles × weights × 3
  // unicode-ranges × metrics fallback) = CSS entry 214 KB bloquant 5.7s.
  fonts: {
    defaults: {
      weights: [400, 600, 700],
      styles: ['normal'],
      subsets: ['latin'],
    },
    experimental: {
      processCSSVariables: true,
    },
  },

  tailwindcss: {
    cssPath: resolve(__layerDir, 'assets/css/main.css'),
  },

  // Doctrine 2026-05-06 : 1 tenant = 1 mode (light XOR dark), zéro toggle.
  // Tous les tenants sont light-only par défaut → on strip les selecteurs
  // `.dark` du CSS compilé pour économiser ~44 KB / -23 % entry.css.
  // Codemyshop (seul tenant dark) opt-out via `postcss.plugins[…] = false`.
  // Le `order` callback déplace le plugin EN DERNIER pour qu'il s'exécute
  // après que Tailwind a généré ses utilities (sinon il walke les
  // directives `@tailwind utilities` brutes et ne strippe rien).
  postcss: {
    plugins: {
      [resolve(__layerDir, 'build/postcss-strip-dark.cjs')]: {},
    },
    order: (names: string[]) => {
      const stripIdx = names.findIndex(n => n.endsWith('postcss-strip-dark.cjs'))
      if (stripIdx < 0) return names
      const stripName = names[stripIdx]
      return [...names.slice(0, stripIdx), ...names.slice(stripIdx + 1), stripName]
    },
  },

  // @nuxt/image — IPX pour logos tenants, hero, blog covers, avatars, uploads BO.
  // Catalogue produit reste servi par ac_productcovergen (WebP statique nginx).
  image: {
    format: ['avif', 'webp'],
    quality: 80,
    screens: {
      xs: 320,
      sm: 640,
      md: 768,
      lg: 1024,
      xl: 1280,
      '2xl': 1536,
    },
    presets: {
      logo:      { modifiers: { format: 'webp', quality: 90, fit: 'inside' } },
      hero:      { modifiers: { format: 'webp', quality: 80, fit: 'cover' } },
      blogCover: { modifiers: { format: 'webp', quality: 80, fit: 'cover' } },
      avatar:    { modifiers: { format: 'webp', quality: 85, fit: 'cover' } },
    },
  },

  // Pas de Google Fonts hardcodée ici : chaque tenant déclare la sienne via
  // theme.typography.fontUrl (cf core/config/clients/*.ts) qui est injectée
  // dynamiquement par core/app.vue avec preconnect + display=swap.
  // Auparavant Playfair Display était hardcodé pour AC Hub, ce qui forçait
  // tous les autres tenants (Example Shop avec Montserrat, etc.) à charger 2 fonts
  // en parallèle — ~750ms gaspillés sur le chemin critique LCP.
  app: {
    head: {
      htmlAttrs: { lang: 'fr' },
    },
  },

  // Dark Mode overrides (chargé APRÈS Tailwind, jamais purgé)
  // resolve() depuis le layer — pas ~/ qui résout vers le rootDir du client
  css: [
    resolve(__layerDir, 'assets/css/dark-overrides.css'),
    resolve(__layerDir, 'assets/css/content-width.css'),
  ],

  // Alias pour que ~/types, ~/utils, ~/data résolvent vers core/
  // ~/enterprise et ~/internal pointent vers les soeurs de core/ (chantier
  // modular-architecture-refactor 2026-05-10, cs_chantier_travail #90)
  alias: {
    '~/types':    resolve(__layerDir, 'types'),
    '~/utils':    resolve(__layerDir, 'utils'),
    '~/data':     resolve(__layerDir, 'data'),
    '~/config':   resolve(__layerDir, 'config'),
    '~/server':   resolve(__layerDir, 'server'),
    '~/modules':  resolve(__layerDir, 'modules'),
    '~/composables': resolve(__layerDir, 'composables'),
    '~/enterprise': resolve(__layerDir, '..', 'enterprise'),
    '~/internal':   resolve(__layerDir, '..', 'internal'),
  },

  // Matomo optionnel
  vite: {
    optimizeDeps: { exclude: ['matomo-js'] },
    build: {
      rollupOptions: { external: ['matomo-js'] },
      // Désactiver les sourcemaps en production (gain ~30% temps de build)
      sourcemap: false,
    },
  },

  // Désactiver la vérification TypeScript au build (gain ~20% temps de build)
  typescript: {
    typeCheck: false,
  },

  // Désactiver les sourcemaps Nitro (serveur)
  sourcemap: { server: false, client: false },

  // Cache build persistant (Nuxt 4) — sérialise Vite + Nitro entre runs.
  // Stocké dans node_modules/.cache/nuxt/, déjà persisté via /app/ entre deploys.
  // Cold build : 0 gain. Warm rebuild : 5-10× sur grosse codebase.
  experimental: {
    buildCache: true,
    // Désactive le prefetch viewport agressif des <NuxtLink> (par défaut Nuxt
    // prefetch tout lien visible à l'IntersectionObserver). Sur un listing
    // catalogue, ça tirait le chunk ProductDetail.vue + chunk page Home (via
    // logo header) avant tout clic — Lighthouse signalait 214 KiB JS unused
    // sur /grossiste/olive/. En interaction-only, le chunk n'est tiré qu'au
    // hover/focus de l'utilisateur, ce qui élimine le pré-chargement parasite
    // tout en gardant la navigation perçue rapide (200 ms hover suffisent à
    // précharger avant le clic). Cicatrice 2026-05-06.
    defaults: {
      nuxtLink: {
        prefetch: true,
        prefetchOn: { visibility: false, interaction: true },
      },
    },
  },

  // Runtime config partagée (les clients peuvent la surcharger)
  runtimeConfig: {
    secret: process.env.NUXT_SECRET,
    apiEncryptionKey: process.env.API_ENCRYPTION_KEY ?? process.env.NUXT_SECRET ?? '',
    prestashopApiKey: process.env.PRESTASHOP_API_KEY,
    psBaseUrl: process.env.PS_BASE_URL ?? 'http://localhost:8080',
    psHost: process.env.PS_DOMAIN ?? 'localhost',
    anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? '',
    mistralApiKey: process.env.MISTRAL_API_KEY ?? '',
    aiSourceType: process.env.AI_SOURCE_TYPE ?? 'contact_form',
    clientId: process.env.NUXT_CLIENT_ID ?? 'ac-hub',
    aiClientId: process.env.AI_CLIENT_ID ?? 'ac-hub',

    // ── Hub (Vaisseau Mère) — API proxy pour tenants distants ──────
    hubApiUrl: process.env.NUXT_HUB_API_URL ?? 'https://codemyshop.com',

    // ── Upload images (logos, hero) — dir Nginx statique sur VPS ──────
    uploadStaticDir: process.env.NUXT_UPLOAD_STATIC_DIR ?? '',

    // ── Module ac_clientconfig (config tenant DB-First multilang) ───
    acClientConfigSecret: process.env.NUXT_AC_CLIENTCONFIG_SECRET ?? process.env.AC_CLIENTCONFIG_SECRET ?? '',

    // ── Module ac_marketplace (features + design systems) ───────────
    acMarketplaceToken: process.env.NUXT_AC_MARKETPLACE_TOKEN ?? process.env.AC_MARKETPLACE_TOKEN ?? '',

    // ── Module ac_academy (Q&A IA + inscription étudiants) ────────
    acAcademyAiToken: process.env.NUXT_AC_ACADEMY_AI_TOKEN ?? process.env.AC_ACADEMY_AI_TOKEN ?? '',

    // ── Stripe (facturation MRR) ────────────────────────────────────
    stripeSecretKey: process.env.STRIPE_SECRET_KEY ?? '',
    stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? '',

    // ── Instagram Graph API (feed homepage — par tenant) ────────────
    // Long-lived Page Access Token (60j, refresh manuel via scripts/instagram-token-setup.sh)
    instagramToken:    process.env.NUXT_INSTAGRAM_TOKEN ?? '',
    instagramIgUserId: process.env.NUXT_INSTAGRAM_IG_USER_ID ?? '',

    // ── Scaleway Object Storage (bucket ac-db-backups) ──────────────
    // Exposé côté hub pour la tab Sauvegardes : list + presigned URL
    // download. Partagé entre tous les tenants — ils filtrent par
    // prefix (mapping clientId → codename tenant côté API).
    scwAccessKey: process.env.AWS_ACCESS_KEY_ID ?? '',
    scwSecretKey: process.env.AWS_SECRET_ACCESS_KEY ?? '',
    scwRegion:    process.env.AWS_DEFAULT_REGION ?? 'fr-par',
    scwEndpoint:  process.env.AWS_ENDPOINT_URL_S3 ?? 'https://s3.fr-par.scw.cloud',
    scwBucket:    process.env.SCW_BUCKET ?? 'ac-db-backups',

    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE ?? 'http://localhost:8080/api',
      psFrontUrl: process.env.NUXT_PUBLIC_PS_FRONT_URL ?? 'http://localhost:8080',
      clientId: process.env.NUXT_PUBLIC_CLIENT_ID ?? 'ac-hub',
      matomoKey: process.env.NUXT_PUBLIC_MATOMO_KEY ?? '',
      matomoHost: process.env.NUXT_PUBLIC_MATOMO_HOST ?? 'https://analytics.codemyshop.fr',
      matomoUrl: process.env.NUXT_PUBLIC_MATOMO_URL ?? 'https://analytics.codemyshop.com',
      matomoSiteId: process.env.NUXT_PUBLIC_MATOMO_SITE_ID ?? '1',

      // ── Branding marque blanche ─────────────────────────────────
      brandName: process.env.NUXT_PUBLIC_BRAND_NAME ?? 'Boutique',
      supportEmail: process.env.NUXT_PUBLIC_SUPPORT_EMAIL ?? '',
      contactEmail: process.env.NUXT_PUBLIC_CONTACT_EMAIL ?? '',
      ownerName: process.env.NUXT_PUBLIC_OWNER_NAME ?? '',
      ownerAvatar: process.env.NUXT_PUBLIC_OWNER_AVATAR ?? '',
      favicon: process.env.NUXT_PUBLIC_FAVICON ?? '/favicon.svg',

      // ── Feature flags PaaS ──────────────────────────────────────
      b2bMode: process.env.NUXT_PUBLIC_B2B_MODE === 'true',
      catalogueIndexable: process.env.NUXT_PUBLIC_CATALOGUE_INDEXABLE === 'true',

      // ── Staff Login URL (footer discret) ────────────────────────
      hubLoginUrl: process.env.NUXT_PUBLIC_HUB_LOGIN_URL ?? '',
    },
  },

  // /hub/** = back-office auth-gated, zéro SEO. SSR off pour éliminer la
  // fenêtre où user.value est null côté serveur (middleware hub-auth skippe
  // sur SSR) : actualRole tombe sur 'EMPLOYEE' → canAccess('crm'|'catalogue'|
  // 'orders'|...) renvoie false → seules les 3 entrées sans v-if (Dashboard,
  // Informations, Playbooks) apparaissent dans le HTML pré-hydratation.
  // Cicatrice 2026-05-05 : sidebar « parfois incomplet » signalé par Alex.
  routeRules: {
    '/hub/**': { ssr: false },
    '/hub':    { ssr: false },
    // Cache long sur les images IPX (logo, hero, covers) — content-addressed
    // par les modifiers dans l'URL, pas de risque de stale. Lighthouse
    // signalait un TTL 60s par défaut sur logo-meyva-example-shop.webp = hit
    // réseau à chaque visite. 1 an immutable.
    '/_ipx/**': {
      headers: {
        'cache-control': 'public, max-age=31536000, immutable',
      },
    },
    // Idem pour les fonts WebFont préfixe Nuxt 4 (/_fonts/) — déjà
    // hashées, immutables.
    '/_fonts/**': {
      headers: {
        'cache-control': 'public, max-age=31536000, immutable',
      },
    },

    // ── Cache SSR Redis (storage 'redis' configuré ci-dessous) ──────────
    // Routes "safe" : aucune personnalisation par session/cookie, le HTML
    // rendu est identique pour tous les visiteurs anonymes. Cache 5 min
    // avec swr (stale-while-revalidate) — le 1er visiteur paie le cold
    // render, les suivants servis instantanément depuis Redis pendant 5 min,
    // puis revalidate en background.
    //
    // Bénéfice attendu : LCP -1 à -2s sur pages cachées en mobile 4G,
    // et décharge la DB des SELECT répétitifs (FAQ, blog, dictionnaire).
    //
    // /grossiste/** + /produit/** ajoutées 2026-05-06 (chantier
    // example-shop-ssr-cache-prices) : les blocs prix B2B et CTA cart/quote
    // sont wrappés <ClientOnly> dans ProductCard/ListRow/Detail + pages
    // [...path]/catalogue/[...slug] + TheHeader. Le HTML SSR caché ne
    // contient JAMAIS les prix ni les boutons session-dépendants —
    // hydratation client via useB2bVisibility selon cookie session.
    // TTL court (60s) : équilibre entre gain perf et fraîcheur catalogue
    // (changements prix/stock visibles sous 1 min en pire cas).
    //
    // EXCLU sciemment :
    //   - / homepage (promos potentiellement personnalisées)
    //   - /api/** (endpoints stateful)
    //   - /devis, /rdv, /inscription, /connexion, /panier, /commander, /mon-compte (forms)
    //   - /favoris (per-user)
    '/blog/**':         { swr: 300, cache: { base: 'redis' } },
    '/marques/**':      { swr: 300, cache: { base: 'redis' } },
    '/auteur/**':       { swr: 300, cache: { base: 'redis' } },
    '/dictionnaire/**': { swr: 600, cache: { base: 'redis' } },
    '/expertise/**':    { swr: 600, cache: { base: 'redis' } },
    '/page/**':         { swr: 600, cache: { base: 'redis' } },
    '/grossiste/**':    { swr: 60,  cache: { base: 'redis' } },
    '/produit/**':      { swr: 60,  cache: { base: 'redis' } },
    // Pages CMS catch-all (rendues par [...path].vue) : sitemap, mentions,
    // etc. — listées par préfixes connus (/cgv, /mentions-legales, …)
    // plutôt que /** qui catcherait /devis/rdv/etc.
    '/cgv':             { swr: 3600, cache: { base: 'redis' } },
    '/mentions-legales':{ swr: 3600, cache: { base: 'redis' } },
    '/cookies':         { swr: 3600, cache: { base: 'redis' } },
    '/contact':         { swr: 600,  cache: { base: 'redis' } },
  },

  nitro: {
    experimental: {
      tasks: true,
    },
    storage: {
      avatars:   { driver: 'fs', base: resolve(__layerDir, 'server/data/avatars') },
      automates: { driver: 'fs', base: resolve(__layerDir, 'server/data/automates') },
      // Redis cache partagé (sessions, rate-limit, cache requêtes coûteuses,
      // locks distribués). REDIS_URL injecté par docker-compose / .env.
      // Si REDIS_URL absent (ex: tenant Example Shop VPS sans container Redis),
      // bascule sur driver memory-fallback (Map JS in-process) plutôt que
      // localhost:6379 qui spam ECONNREFUSED en boucle. Tous les callers
      // (cachedFetch/rateLimit/withLock) ont déjà un fail-open propre.
      redis: process.env.REDIS_URL
        ? {
            driver: 'redis',
            url: process.env.REDIS_URL,
            base: 'ac:',
            // ioredis : éviter le retry infini si le serveur disparait.
            // 1 tentative max, queue offline désactivée — le caller fail-open.
            lazyConnect: true,
            maxRetriesPerRequest: 1,
            enableOfflineQueue: false,
          }
        : {
            // Fallback in-process. Toutes les ops cache/rate-limit/lock
            // restent fonctionnelles côté un seul process Node (cas
            // tenant single-PM2 sans Redis).
            driver: 'memory',
          },
    },
    alias: {
      '~/server':      resolve(__layerDir, 'server'),
      '~/types':       resolve(__layerDir, 'types'),
      '~/utils':       resolve(__layerDir, 'utils'),
      '~/config':      resolve(__layerDir, 'config'),
      '~/composables': resolve(__layerDir, 'composables'),
    },
    scheduledTasks: {
      // Travail #43 python-nitro-tasks Wave 1 — ports en cours.
      // Conv shadow : Nitro Task décalée +15 min vs cron Python correspondant
      // pour comparaison 1:1 sans race INSERT. Cutover = re-aligner Python
      // off + Nitro sur l'heure d'origine (CRONLINES éditer ici).
      // ─ ac_audit_schema  (Python 15 4 * * *) → 30 4 * * *
      '30 4 * * *': ['audit:schema-watch'],
      // ─ ac_sitemap_audit (crontab Python réel 45 7 * * * — drift vs DB
      //   cs_automates '30 7 * * *') → 0 8 * * * pour shadow propre
      //   (15 min après le run Python). Drift à corriger Wave 2.
      '0 8 * * *': ['audit:sitemap-watch'],
      // ─ ac_synedre_watch (Python samedi 45 7 * * 6) → 0 8 * * 6
      //   Shadow hebdo : compare Python report JSON FS vs Nitro
      //   cs_audit_reports report_type=synedre_watch.
      '0 8 * * 6': ['audit:synedre-watch'],
      // ─ ac_matomo_check (Python 0 8 * * *) → 15 8 * * *
      //   Wave 1A.5 — audit-only. Note port : cs_client_vps n'a
      //   PAS matomo_site_id post-cutover MariaDB→PG, fleet load
      //   silencieusement vide (parité Python). À fixer Wave 1 actif.
      '15 8 * * *': ['audit:matomo-watch'],
      // ─ ac_dictionary_watch (Python 0 20 * * *) → 15 20 * * *
      //   Wave 1A.6 — audit-only. 4 SELECT (cs_dictionary +
      //   cs_agents + cs_academy_module + ps_cms_lang),
      //   extract_concepts regex compound, INSERT cs_audit_reports.
      '15 20 * * *': ['audit:dictionary-watch'],
      // ─ ac_blog_hygiene (Python 30 7 * * *) → 45 7 * * *
      //   Wave 1 actif #1 — première Vigie write-side. UPDATE
      //   ps_cms.active=0 conditionnel via getAuditMode() — default
      //   'shadow' (skip writes). Cutover = AUDIT_MODE=active +
      //   désactivation cron Python le même jour.
      '45 7 * * *': ['audit:blog-hygiene'],
      // ─ ac_pageaudit (Python 55 7 * * *) → 10 8 * * *
      //   Wave 1 actif #2. Audit 10 checks (HTTP+JSON-LD+meta+FAQ+slug
      //   +crosslinks DB-only) + auto-fix natifs DB sous AUDIT_MODE
      //   active (dates, newlines échappés, apostrophes, HTML-FAQ).
      //   Subprocess Python (cover, links) skippés Wave 1 — laissés au
      //   cron Python jusqu'au port complet ac_coverinject + ac_linkmap.
      '10 8 * * *': ['audit:pageaudit'],
      // ─ ac_factcheck (Python 30 7 * * *) → 50 7 * * *
      //   Wave 1 actif #3. Anti-hallucination : 7 checks (agent_name,
      //   agent_role, agent_count, business_fact, internal_url,
      //   mentor_agent_conflict, cannibalization Jaccard ≥ 70%).
      //   Auto-fix natif DB sous AUDIT_MODE active : UPDATE
      //   ps_cms_lang.content pour les agent_name BLOQUANT corrigeables
      //   (= "l'agent Rôle (FauxNom)" → bon nickname inféré du rôle).
      '50 7 * * *': ['audit:factcheck'],
      // ─ ac_brand_watch (Python 0 7 * * *) → 15 7 * * *
      //   Wave 2 #1 (1ère Vigie deps externes). Surveillance SERP via
      //   Google CSE API v1 (free 100 q/jour, 7 termes/jour = OK). Pré-
      //   requis env GOOGLE_CSE_API_KEY + GOOGLE_CSE_ID — sans clé, le
      //   port tourne quand même (skip:no-cse, status='partial'). Email
      //   Montesquieu skippé en shadow ; cutover = AUDIT_MODE active.
      '15 7 * * *': ['audit:brand-watch'],
      // ─ ac_clients_uptime_monitor (Python */3 * * * *) → 1-59/3 * * * *
      // Wave 1 high-freq (last of Wave 1). 1 min offset vs
      // Python (Python = 0,3,6,9... / Nitro = 1,4,7,10...) — no
      // race on advisory lock or SMTP. Live state persisted
      // in cs_uptime_state (≠ Python which writes JSON FS), no
      // conflict. Email alert/recovery skipped in shadow; AUDIT_MODE=
      // active = cutover (disable Python cron same day).
      '1-59/3 * * * *': ['audit:uptime-monitor'],
      // cover:queue-process — Wave 3 #3 Phase D of task #43.
      //   Consumer cs_covergen_queue (port ac_covergen --process-queue).
      // Current Python cron: */5 * * * * (0,5,10...). 1-min Nitro offset
      // for clean shadow: 1-59/5 (1,6,11,16...). Cutover Phase E =
      // disable Python cron same day as activation (clear
      // its schedule column in cs_automates and remove the line from
      // system crontab).
      '1-59/5 * * * *': ['cover:queue-process'],
      // business:expiry-discounts — Wave 4F of task #43.
      //   Port ac_cron_expiry_discounts (cron Python 35 3 * * * --apply).
      // Nitro offset 50 3 * * * (15 min after Python). AUDIT_MODE
      // shadow by default = preview only (equivalent to Python --dry-run).
      //   Cutover via AUDIT_MODE_AC_CRON_EXPIRY_DISCOUNTS=active +
      // disable Python cron same day.
      '50 3 * * *': ['business:expiry-discounts'],
      // audit:deps-watch — Wave 4A of task #43.
      // Port ac_deps_audit (Thursday 2h UTC). npm audit + outdated in
      // /app, writes cs_audit_reports. 15 min offset vs Python (Python
      // = 0 2 / Nitro = 15 2) for clean shadow. Cutover via
      // AUDIT_MODE_AC_DEPS_AUDIT=active + disable Python cron.
      '15 2 * * 4': ['audit:deps-watch'],
      // cover:carousel-process — Wave 4B of task #43.
      //   Consumer cs_carousel_queue (port ac_carouselgen.py). Cron
      // sufficient schedule for LinkedIn carousels (low volume vs
      // blog covers). No active Python consumer at time of port:
      // direct activation without cutover.
      '15 * * * *': ['cover:carousel-process'],
      // seo:crosslinks-rebuild — Wave 4D of task #43.
      // Ports ac_linkmap.py which wrote to internal_links.json
      // FS (unused since PHP removal 2026-05-01) → DB-First
      // cs_crosslinks (frozen 2026-04-04, 72 rows). No shadow:
      // Python doesn't write this table, direct cutover without risk.
      // Runs before audit:pageaudit (10 8) which reads cs_crosslinks.
      '5 4 * * *': ['seo:crosslinks-rebuild'],
      // audit:ssl-watch — Wave 4D Tier B1 of task #43.
      //   Port ac_ssl_check.py (cron Python 30 6). tls.connect natif Node
      // (no openssl, absent from container). Audit-only: persists report
      // cs_audit_reports report_type='ssl_check'. Incident recorded
      // under AUDIT_MODE_AC_SSL_CHECK=active if days_left < 14. Cutover
      // direct (no shadow): Python is non-blocking (alert
      //   redondante vs certbot auto-renew).
      '30 6 * * *': ['audit:ssl-watch'],
      // audit:daily-meet — Wave 4 of task #43.
      // Port ac_daily_meet.py (Python cron 0 5 * * 1-6). Pre-calculates a
      // daily report (10 sections DB+HTTP checks) consumed by
      // bin/session-brief.mjs at each Claude Code session startup.
      //   Sections host-side (git, crontab) → wrapper TS standalone.
      //   Persiste cs_audit_reports report_type='daily_meet' (1 row/jour,
      // DELETE pre-INSERT idempotent). No AUDIT_MODE: audit-only.
      // Direct Python cutover same day (no shadow needed:
      // Python writes JSON FS, TS writes DB, two independent stores).
      '0 5 * * 1-6': ['audit:daily-meet'],
      // ─ inbox:sync — Wave 3 of task #43.
      //   Port ac_inbox.py (cron Python 0 7,10,14,18 — en pause depuis
      // 2026-04-21 PAUSE_TOKEN_WEEK, script archived 2026-04-30 task
      //   #44). Connexion IMAP OVH (ssl0.ovh.net:993, mini-client pur Node
      //   utils/imap.ts), UID SEARCH SINCE -7d, INSERT idempotent
      //   cs_inbox_emails (ON CONFLICT imap_id DO NOTHING). Cadence
      // tightened to 5 min since dedup now lives in DB.
      // Direct cutover (no shadow: Python already off for 13d).
      '*/5 * * * *': ['inbox:sync'],
      // email:queue-process — drain cs_email_queue (travail
      // example-shop-hub-email-config). 1 email/run to avoid getting banned
      // MTA reputation Resend/OVH. Cron 60s (every minute) =
      // 60 emails/h max if queue is full. Start at H+1 to
      // avoid overlapping other tasks at boot.
      '* * * * *': ['email:queue-process'],
      // email:client-sync — populates cs_email_message via IMAP for the
      // Mail tab of the hub (/hub/crm/email). Multi-tenant: each Nuxt
      // syncs its own mailbox (account_user = SMTP_USER local). Offset
      // minute=2 to avoid stepping on inbox:sync (minute=0).
      '2-59/5 * * * *': ['email:client-sync'],
    },
  },
})
