/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * Middleware Nitro — redirections 301 legacy (ancien CMS → URLs Nuxt).
 *
 * Source : table cs_redirect (DB de l'instance courante, module ac_redirect).
 * Reading via the `listActiveRedirects` facade (Drizzle, multi-tenant aware).
 * Match strategy (by priority order):
 * 1. Exact source_path match (memory cache)
 *   2. Pattern produit `/{id}-{slug}.html` → lookup par source_id + kind=product
 * 3. Category pattern `/{id}-{slug}` → lookup by source_id + kind=category
 */

import { listActiveRedirects } from '../../modules/redirect/server/utils/redirect'

// ─────────────────────────────────────────────────────────────────────────────
// Cache mémoire (chargé paresseusement, refresh toutes les CACHE_TTL_MS)
// ─────────────────────────────────────────────────────────────────────────────
const CACHE_TTL_MS = 5 * 60 * 1000

interface RedirectCache {
  byPath: Map<string, { target: string; code: number }>
  byCatId: Map<number, { target: string; code: number }>
  byProductId: Map<number, { target: string; code: number }>
  loadedAt: number
  available: boolean
}

let cache: RedirectCache | null = null
let loading: Promise<RedirectCache> | null = null

async function loadCache(event: any): Promise<RedirectCache> {
  const empty: RedirectCache = {
    byPath: new Map(),
    byCatId: new Map(),
    byProductId: new Map(),
    loadedAt: Date.now(),
    available: false,
  }

  try {
    const rows = await listActiveRedirects({ event })
    if (!rows.length) return empty

    const next: RedirectCache = {
      byPath: new Map(),
      byCatId: new Map(),
      byProductId: new Map(),
      loadedAt: Date.now(),
      available: true,
    }

    for (const r of rows) {
      const entry = { target: r.targetPath, code: r.statusCode || 301 }
      next.byPath.set(r.sourcePath, entry)
      if (r.sourceId != null) {
        if (r.sourceKind === 'category') next.byCatId.set(r.sourceId, entry)
        else if (r.sourceKind === 'product') next.byProductId.set(r.sourceId, entry)
      }
    }
    return next
  } catch (err: any) {
    console.error('[legacy-redirects] Erreur chargement cache :', err?.message)
    return empty
  }
}

async function getCache(event: any): Promise<RedirectCache> {
  const now = Date.now()
  if (cache && now - cache.loadedAt < CACHE_TTL_MS) return cache
  if (loading) return loading
  loading = loadCache(event).then((c) => {
    cache = c
    loading = null
    return c
  })
  return loading
}

// ─────────────────────────────────────────────────────────────────────────────
// Patterns d'URL legacy PrestaShop
// ─────────────────────────────────────────────────────────────────────────────
const PRODUCT_RE     = /^\/(\d+)-[^/]+\.html$/
const CATEGORY_RE    = /^\/(\d+)-[^/]+$/
const PRODUIT_ID_RE  = /^\/produit\/(\d+)$/

export default defineEventHandler(async (event) => {
  const url = getRequestURL(event)
  const path = url.pathname

  // Skip les assets, l'API et les routes Nuxt internes
  if (
    path.startsWith('/_') ||
    path.startsWith('/api/') ||
    path.includes('.') && !path.endsWith('.html')
  ) {
    return
  }

  // /catalogue/* → 301 vers /grossiste/ (Example Shop v2 uniquement — menu legacy
  // → silos SEO). Avant incidents 2026-04-22 : hardcode cross-tenant qui
  // cassait /catalogue/{cat}/ sur SMOKE v2. Scope via runtimeConfig.clientId.
  const clientIdForRedirect = (useRuntimeConfig(event).clientId as string | undefined) || ''
  if (clientIdForRedirect === 'example-shop' && (path.startsWith('/catalogue/') || path === '/catalogue')) {
    return sendRedirect(event, '/grossiste/', 301)
  }

  const c = await getCache(event)
  if (!c.available) return

  // 1. Match exact
  const exact = c.byPath.get(path)
  if (exact) {
    return sendRedirect(event, exact.target, exact.code)
  }

  // 2. Pattern produit /{id}-*.html
  const mProd = path.match(PRODUCT_RE)
  if (mProd) {
    const hit = c.byProductId.get(Number(mProd[1]))
    if (hit) return sendRedirect(event, hit.target, hit.code)
  }

  // 3. Pattern catégorie /{id}-*
  const mCat = path.match(CATEGORY_RE)
  if (mCat) {
    const hit = c.byCatId.get(Number(mCat[1]))
    if (hit) return sendRedirect(event, hit.target, hit.code)
  }

  // 4. Pattern /produit/{id} → 301 vers URL canonique SEO (Example Shop v2 uniquement).
  // Avant incidents 2026-04-22 : hardcode cross-tenant qui renvoyait tous les
  // tenants vers /grossiste/... même quand ils n'avaient pas de pilier.
  // SMOKE v2 sert la fiche produit directement via clients/example-vape/pages/produit/[id].vue.
  const mProduit = path.match(PRODUIT_ID_RE)
  if (mProduit && clientIdForRedirect === 'example-shop') {
    const pid = Number(mProduit[1])
    try {
      const db = useClientDb(event)
      const rows = await db.query<{ link_rewrite: string; id_category_default: number }>(
        `SELECT pl.link_rewrite, p.id_category_default
           FROM ps_product p
           JOIN ps_product_lang pl ON pl.id_product = p.id_product AND pl.id_lang = 1
          WHERE p.id_product = ? AND p.active = 1
          LIMIT 1`,
        [pid],
      )
      if (rows.length) {
        const { buildCategoryPathMap, buildProductUrlFromCategory } = await import('~/server/utils/category-path')
        const { resolveTenantPiliers } = await import('~/server/utils/tenant-piliers')
        const piliers = await resolveTenantPiliers(event, db, 1)
        const pathMap = await buildCategoryPathMap(db, [rows[0].id_category_default], 1, piliers)
        const prefixesByPilier: Record<string, string> = {}
        for (const p of piliers) prefixesByPilier[p.slug] = p.slug
        const url = buildProductUrlFromCategory(
          rows[0].id_category_default,
          rows[0].link_rewrite,
          pathMap,
          { prefixesByPilier, langPrefix: '', productId: pid },
        )
        return sendRedirect(event, url, 301)
      }
    } catch {
      // DB error → pass-through
    }
  }
})
