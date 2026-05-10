/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * GET /api/category?pilier=grossiste&path=olive/lucque&lang=fr
 *
 * Resolves a native PS category path under a root category and returns metadata
 * SEO, direct children, breadcrumb trail, and product aggregates.
 *
 * Tenant-agnostic: the root category is resolved dynamically by link_rewrite
 * (id_lang=1) among active categories of level ≤ 2. Each tenant
 * declares its root categories via runtimeConfig.public.piliers[].
 *
 * Mapping SEO :
 *   - intro_html (hero)            ← ps_category_lang.description (3§ SEO)
 *   - long_description_html (bas)  ← ps_category_lang.additional_description
 *   - meta_title / meta_description ← ps_category_lang.* (natif PS)
 * - image_url                    ← /img/c/{id}.jpg if the file exists (best-effort)
 */
import { useClientDb } from '~/server/utils/db'
import { resolveIdLang } from '~/server/utils/lang'
import { listFaqsByParent } from '~/modules/faq/server/utils/faq'

interface CategoryChild {
  id: number
  slug: string
  path: string
  label: string
  /** Présent uniquement pour les cross-categories : pilier slug d'origine
   * (may differ from the host root category). If absent → native child, the root category
   * is the current page's one. */
  pilier?: string
}

interface CategoryFaqItem {
  position: number
  question: string
  answer_html: string
}

interface CategoryAggregate {
  total: number
  price_min: number | null
  price_max: number | null
}

export interface CategoryResponse {
  found: boolean
  kind: 'pilier' | 'category'
  pilier: string
  id_category: number | null
  id_parent: number | null
  level_depth: number
  path: string
  slug: string
  name: string
  h1: string
  meta_title: string
  meta_description: string
  intro_html: string | null
  long_description_html: string | null
  /** URL JPG legacy 800×800 — fallback universel. */
  image_url: string | null
  /** WebP responsive srcset (400/600/800/1200 square 1:1). Empty if category has no image. */
  image_webp_srcset: string | null
  /** sizes hint for the browser. Hero col-4 desktop / full width mobile. */
  image_sizes: string | null
  breadcrumb: Array<{ label: string; path: string }>
  children: CategoryChild[]
  aggregate: CategoryAggregate
  faq: CategoryFaqItem[]
}

const COVER_WIDTHS = [400, 600, 800, 1200] as const

function slugifyForFilename(s: string): string {
  return (s || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'category'
}

async function getMasterSlug(db: any, idCategory: number): Promise<string> {
  // The WebP filename always uses the id_lang=1 (master) slug to remain
  // stable: FR/EN/DE translations may diverge, the file does not move.
  const row = await db.get<{ link_rewrite: string }>(
    'SELECT link_rewrite FROM ps_category_lang WHERE id_category = ? AND id_lang = 1 AND id_shop = 1 LIMIT 1',
    [idCategory],
  )
  return slugifyForFilename(row?.link_rewrite || `cat-${idCategory}`)
}

function buildImageUrls(id: number, masterSlug: string): { url: string; srcset: string; sizes: string } {
  const srcset = COVER_WIDTHS.map(w => `/img/c/${id}-${masterSlug}-${w}.webp ${w}w`).join(', ')
  return {
    url: `/img/c/${id}.jpg`,
    srcset,
    // Hero CategoryHero : md:col-span-4 (≈33vw ≥768px) sinon 100vw mobile
    sizes: '(min-width: 768px) 33vw, 100vw',
  }
}

/**
 * Resolves the id_category of a root category by its link_rewrite. Searches among the
 * active categories, preference level ≤ 2 (usual root categories: children of the
 * shop root or "Home"). Returns null if no match.
 *
 * A memory cache per (slug, db-pool) avoids the lookup on each request.
 */
const pilierCache = new Map<string, { id: number; level_depth: number; id_parent: number } | null>()

async function resolvePilier(db: any, slug: string): Promise<{ id: number; level_depth: number; id_parent: number } | null> {
  if (!slug) return null
  if (pilierCache.has(slug)) return pilierCache.get(slug)!
  const row = await db.get<{ id_category: number; level_depth: number; id_parent: number }>(
    `SELECT c.id_category, c.level_depth, c.id_parent
       FROM ps_category c
       JOIN ps_category_lang cl ON cl.id_category = c.id_category AND cl.id_lang = 1 AND cl.id_shop = 1
      WHERE cl.link_rewrite = ? AND c.active = 1
      ORDER BY c.level_depth ASC, c.id_category ASC
      LIMIT 1`,
    [slug],
  )
  const result = row ? { id: row.id_category, level_depth: row.level_depth, id_parent: row.id_parent } : null
  pilierCache.set(slug, result)
  return result
}

interface CategoryRow {
  id_category: number
  id_parent: number
  level_depth: number
  name: string
  link_rewrite: string
  description: string | null
  additional_description: string | null
  meta_title: string | null
  meta_description: string | null
}

/**
 * Walk segments from the root category: each segment must match the link_rewrite
 * of a direct child category (fallback id_lang=1 if the requested language does not
 * contain the row). Returns the leaf category or null if a segment
 * does not resolve.
 */
async function walkSegments(
  db: any,
  segments: string[],
  pilierId: number,
  idLang: number,
): Promise<CategoryRow | null> {
  let currentParent = pilierId
  let lastRow: CategoryRow | null = null

  for (const seg of segments) {
    const row = await db.get<CategoryRow>(
      `SELECT c.id_category, c.id_parent, c.level_depth,
              COALESCE(cl.name, clf.name, '')             AS name,
              COALESCE(cl.link_rewrite, clf.link_rewrite) AS link_rewrite,
              COALESCE(cl.description, clf.description)   AS description,
              COALESCE(cl.additional_description, clf.additional_description) AS additional_description,
              COALESCE(cl.meta_title, clf.meta_title)         AS meta_title,
              COALESCE(cl.meta_description, clf.meta_description) AS meta_description
         FROM ps_category c
    LEFT JOIN ps_category_lang cl  ON cl.id_category  = c.id_category AND cl.id_lang = ? AND cl.id_shop = 1
    LEFT JOIN ps_category_lang clf ON clf.id_category = c.id_category AND clf.id_lang = 1 AND clf.id_shop = 1
        WHERE c.id_parent = ? AND c.active = 1
          AND (cl.link_rewrite = ? OR clf.link_rewrite = ?)
        LIMIT 1`,
      [idLang, currentParent, seg, seg],
    )
    if (!row) return null
    currentParent = row.id_category
    lastRow = row
  }
  return lastRow
}

/**
 * H1 custom depuis cs_category_extra_lang (module ac_categoryextra).
 * Delegated to the Drizzle facade. Null if absent → fallback to
 * ps_category_lang.name on the caller side.
 */
async function getCustomH1(_db: any, idCategory: number, idLang: number, event?: any): Promise<string | null> {
  try {
    const { getCategoryH1 } = await import('~/modules/category-extra/server/utils/category-extra')
    return await getCategoryH1(idCategory, idLang, { event })
  } catch (e: any) {
    console.error('[category] custom H1 error:', e?.message)
    return null
  }
}

/**
 * Loads the ancestor tree from the root category to the current category (excludes the root category
 * itself, includes the current category) to build the breadcrumb and
 * reconstruct the path in localized slugs.
 */
async function loadAncestors(
  db: any,
  idCategory: number,
  pilierId: number,
  idLang: number,
): Promise<Array<{ id: number; name: string; link_rewrite: string }>> {
  const chain: Array<{ id: number; name: string; link_rewrite: string }> = []
  let cursor: number | null = idCategory
  const guard = new Set<number>()
  while (cursor && cursor !== pilierId && !guard.has(cursor)) {
    guard.add(cursor)
    const row = await db.get<{ id_category: number; id_parent: number; name: string; link_rewrite: string }>(
      `SELECT c.id_category, c.id_parent,
              COALESCE(cl.name, clf.name, '')             AS name,
              COALESCE(cl.link_rewrite, clf.link_rewrite) AS link_rewrite
         FROM ps_category c
    LEFT JOIN ps_category_lang cl  ON cl.id_category  = c.id_category AND cl.id_lang = ? AND cl.id_shop = 1
    LEFT JOIN ps_category_lang clf ON clf.id_category = c.id_category AND clf.id_lang = 1 AND clf.id_shop = 1
        WHERE c.id_category = ? LIMIT 1`,
      [idLang, cursor],
    )
    if (!row) break
    chain.unshift({ id: row.id_category, name: row.name, link_rewrite: row.link_rewrite })
    cursor = row.id_parent
  }
  return chain
}

export default defineEventHandler(async (event): Promise<CategoryResponse> => {
  const idLang = await resolveIdLang(event)
  const query = getQuery(event)

  const pilierKey = String(query.pilier ?? '').toLowerCase().replace(/[^a-z0-9-]/g, '')
  if (!pilierKey) {
    throw createError({ statusCode: 400, message: 'pilier manquant' })
  }

  const db = useClientDb(event)
  const pilierRow = await resolvePilier(db, pilierKey)
  if (!pilierRow) {
    throw createError({ statusCode: 404, message: `pilier introuvable : ${pilierKey}` })
  }
  const pilier = { id: pilierRow.id }

  const rawPath = String(query.path ?? '').trim().replace(/^\/+|\/+$/g, '')
  const segments = rawPath ? rawPath.split('/').filter(Boolean) : []

  if (segments.length > 4) {
    throw createError({ statusCode: 400, message: 'Profondeur URL > 4 niveaux' })
  }
  for (const seg of segments) {
    if (!/^[a-z0-9-]+$/.test(seg)) {
      throw createError({ statusCode: 400, message: `Slug invalide : ${seg}` })
    }
  }

  // pilierLabel sera le name natif de la catégorie (localisé via ps_category_lang)
  // résolu après fetch pilierMeta.

  // ── Cas 1 : root pilier (/grossiste/ ou /marque/) ─────────────────────────
  if (segments.length === 0) {
    // Filtre sous-catégories stériles : on exclut celles dont le sous-arbre
    // ne contient aucun produit actif (via nleft/nright PS natif).
    // Exception : cats virtuelles 390/391/392 (Nouveautés/Promotions/Meilleures
    // ventes) qui projettent dynamiquement et doivent rester visibles.
    const rows = await db.query<CategoryRow>(
      `SELECT c.id_category, c.id_parent, c.level_depth,
              COALESCE(cl.name, clf.name, '')             AS name,
              COALESCE(cl.link_rewrite, clf.link_rewrite) AS link_rewrite,
              COALESCE(cl.description, clf.description)   AS description,
              COALESCE(cl.additional_description, clf.additional_description) AS additional_description,
              COALESCE(cl.meta_title, clf.meta_title)     AS meta_title,
              COALESCE(cl.meta_description, clf.meta_description) AS meta_description
         FROM ps_category c
    LEFT JOIN ps_category_lang cl  ON cl.id_category  = c.id_category AND cl.id_lang = ? AND cl.id_shop = 1
    LEFT JOIN ps_category_lang clf ON clf.id_category = c.id_category AND clf.id_lang = 1 AND clf.id_shop = 1
        WHERE c.id_parent = ? AND c.active = 1
          AND (
            c.id_category IN (390, 391, 392)
            OR EXISTS (
              SELECT 1 FROM ps_product p
              JOIN ps_category_product cp ON cp.id_product = p.id_product
              JOIN ps_category d ON d.id_category = cp.id_category AND d.active = 1
              WHERE p.active = 1 AND d.nleft BETWEEN c.nleft AND c.nright
            )
          )
        ORDER BY c.position ASC`,
      [idLang, pilier.id],
    )

    // Meta pilier depuis ps_category_lang (cat 260 / 321)
    const pilierMeta = await db.get<CategoryRow>(
      `SELECT c.id_category, c.id_parent, c.level_depth,
              COALESCE(cl.name, clf.name, '')             AS name,
              COALESCE(cl.link_rewrite, clf.link_rewrite) AS link_rewrite,
              COALESCE(cl.description, clf.description)   AS description,
              COALESCE(cl.additional_description, clf.additional_description) AS additional_description,
              COALESCE(cl.meta_title, clf.meta_title)     AS meta_title,
              COALESCE(cl.meta_description, clf.meta_description) AS meta_description
         FROM ps_category c
    LEFT JOIN ps_category_lang cl  ON cl.id_category  = c.id_category AND cl.id_lang = ? AND cl.id_shop = 1
    LEFT JOIN ps_category_lang clf ON clf.id_category = c.id_category AND clf.id_lang = 1 AND clf.id_shop = 1
        WHERE c.id_category = ? LIMIT 1`,
      [idLang, pilier.id],
    )

    const pilierCustomH1 = await getCustomH1(db, pilier.id, idLang, event)
    const pilierImages = buildImageUrls(pilier.id, await getMasterSlug(db, pilier.id))
    const pilierLabel = pilierMeta?.name || pilierKey

    // Agrégat produits descendants — même CTE récursive que Cas 2 (sous-cat).
    // Sans ça, hasProducts=false côté <CategoryPage> ⇒ grille jamais montée +
    // SEO numberOfItems=0. Le pilier est un nœud d'arbre comme un autre.
    let pilierAgg: CategoryAggregate = { total: 0, price_min: null, price_max: null }
    try {
      const aggRows = await db.query<{ total: number; price_min: number | null; price_max: number | null }>(
        `WITH RECURSIVE cat_tree AS (
           SELECT id_category FROM ps_category WHERE id_category = ? AND active = 1
           UNION ALL
           SELECT c.id_category FROM ps_category c
           INNER JOIN cat_tree ct ON c.id_parent = ct.id_category
           WHERE c.active = 1
         )
         SELECT COUNT(DISTINCT p.id_product) AS total,
                MIN(p.price) AS price_min,
                MAX(p.price) AS price_max
           FROM cat_tree t
           JOIN ps_category_product cp ON cp.id_category = t.id_category
           JOIN ps_product p ON p.id_product = cp.id_product AND p.active = 1`,
        [pilier.id],
      )
      const r = aggRows[0]
      if (r) pilierAgg = {
        total: Number(r.total ?? 0),
        price_min: r.price_min !== null ? Number(r.price_min) : null,
        price_max: r.price_max !== null ? Number(r.price_max) : null,
      }
    } catch (e: any) {
      console.error('[category] pilier aggregate error:', e?.message)
    }

    // FAQ pilier — façade ac_faq (parent_type='category'). Pareil que Cas 2.
    // Sans ça, hasFaq=false côté <CategoryPage> ⇒ section FAQ + JSON-LD
    // FAQPage manquants. ER_NO_SUCH_TABLE swallow si ac_faq pas installé.
    let pilierFaq: CategoryFaqItem[] = []
    try {
      const items = await listFaqsByParent('category', pilier.id, idLang, { event })
      pilierFaq = items
        .filter(it => it.question)
        .map(it => ({ position: it.position, question: it.question, answer_html: it.answer }))
    } catch (e: any) {
      if (e?.code !== 'ER_NO_SUCH_TABLE' && e?.errno !== 1146) {
        console.error('[category] pilier FAQ error:', e?.message)
      }
    }

    return {
      found: true,
      kind: 'pilier',
      pilier: pilierKey,
      id_category: pilier.id,
      id_parent: pilierMeta?.id_parent ?? null,
      level_depth: pilierMeta?.level_depth ?? 2,
      path: '',
      slug: '',
      name: pilierLabel,
      h1: pilierCustomH1 || pilierLabel,
      meta_title: pilierMeta?.meta_title || pilierLabel,
      meta_description: pilierMeta?.meta_description || '',
      intro_html: pilierMeta?.description ?? null,
      long_description_html: pilierMeta?.additional_description ?? null,
      image_url: pilierImages.url,
      image_webp_srcset: pilierImages.srcset,
      image_sizes: pilierImages.sizes,
      breadcrumb: [{ label: pilierLabel, path: '' }],
      children: rows.map(r => ({
        id: r.id_category,
        slug: r.link_rewrite,
        path: r.link_rewrite,
        label: r.name,
      })),
      aggregate: pilierAgg,
      faq: pilierFaq,
    }
  }

  // ── Cas 2 : catégorie sous pilier (1-4 segments) ──────────────────────────
  const leaf = await walkSegments(db, segments, pilier.id, idLang)
  if (!leaf) {
    return {
      found: false,
      kind: 'category',
      pilier: pilierKey,
      id_category: null,
      id_parent: null,
      level_depth: segments.length,
      path: rawPath,
      slug: segments[segments.length - 1],
      name: '',
      h1: '',
      meta_title: '',
      meta_description: '',
      intro_html: null,
      long_description_html: null,
      image_url: null,
      image_webp_srcset: null,
      image_sizes: null,
      breadcrumb: [],
      children: [],
      aggregate: { total: 0, price_min: null, price_max: null },
      faq: [],
    }
  }

  // Breadcrumb + path reconstruit en slugs localisés via la chaîne ancestor
  const chain = await loadAncestors(db, leaf.id_category, pilier.id, idLang)
  const localizedPath = chain.map(c => c.link_rewrite).join('/')
  // Label pilier : name natif (localisé via ps_category_lang) pour l'entrée
  // de tête du breadcrumb. Fallback au slug si la ligne n'existe pas.
  const pilierRoot = await db.get<{ name: string }>(
    `SELECT COALESCE(cl.name, clf.name, '') AS name
       FROM ps_category c
  LEFT JOIN ps_category_lang cl  ON cl.id_category  = c.id_category AND cl.id_lang = ? AND cl.id_shop = 1
  LEFT JOIN ps_category_lang clf ON clf.id_category = c.id_category AND clf.id_lang = 1 AND clf.id_shop = 1
      WHERE c.id_category = ? LIMIT 1`,
    [idLang, pilier.id],
  )
  const pilierLabel = pilierRoot?.name || pilierKey
  const breadcrumb: Array<{ label: string; path: string }> = [
    { label: pilierLabel, path: '' },
  ]
  for (let i = 0; i < chain.length; i++) {
    breadcrumb.push({
      label: chain[i].name || chain[i].link_rewrite,
      path: chain.slice(0, i + 1).map(c => c.link_rewrite).join('/'),
    })
  }

  // Enfants directs (actifs, triés PS natifs).
  // Filtre identique au pilier root : on cache les sous-cats stériles
  // (sous-arbre sans produit actif) sauf les 3 virtuelles whitelist.
  const childRows = await db.query<CategoryRow>(
    `SELECT c.id_category, c.id_parent, c.level_depth,
            COALESCE(cl.name, clf.name, '')             AS name,
            COALESCE(cl.link_rewrite, clf.link_rewrite) AS link_rewrite,
            COALESCE(cl.description, clf.description)   AS description,
            COALESCE(cl.additional_description, clf.additional_description) AS additional_description,
            COALESCE(cl.meta_title, clf.meta_title)     AS meta_title,
            COALESCE(cl.meta_description, clf.meta_description) AS meta_description
       FROM ps_category c
  LEFT JOIN ps_category_lang cl  ON cl.id_category  = c.id_category AND cl.id_lang = ? AND cl.id_shop = 1
  LEFT JOIN ps_category_lang clf ON clf.id_category = c.id_category AND clf.id_lang = 1 AND clf.id_shop = 1
      WHERE c.id_parent = ? AND c.active = 1
        AND (
          c.id_category IN (390, 391, 392)
          OR EXISTS (
            SELECT 1 FROM ps_product p
            JOIN ps_category_product cp ON cp.id_product = p.id_product
            JOIN ps_category d ON d.id_category = cp.id_category AND d.active = 1
            WHERE p.active = 1 AND d.nleft BETWEEN c.nleft AND c.nright
          )
        )
      ORDER BY c.position ASC`,
    [idLang, leaf.id_category],
  )

  // Cross-categories : liens externes affichés en queue des enfants natifs.
  // cs_category_cross (host=leaf.id_category) → array d'id_cross_category
  // résolus en row catégorie + chain (pour reconstruire un path absolu, vu que
  // le pilier de la cross peut différer de celui de l'hôte).
  const crossRows = await db.query<CategoryRow & { id_cross_category: number; cross_pos: number }>(
    `SELECT cc.id_cross_category, cc.position AS cross_pos,
            c.id_category, c.id_parent, c.level_depth,
            COALESCE(cl.name, clf.name, '')             AS name,
            COALESCE(cl.link_rewrite, clf.link_rewrite) AS link_rewrite,
            COALESCE(cl.description, clf.description)   AS description,
            COALESCE(cl.additional_description, clf.additional_description) AS additional_description,
            COALESCE(cl.meta_title, clf.meta_title)     AS meta_title,
            COALESCE(cl.meta_description, clf.meta_description) AS meta_description
       FROM cs_category_cross cc
       JOIN ps_category c        ON c.id_category = cc.id_cross_category AND c.active = 1
  LEFT JOIN ps_category_lang cl  ON cl.id_category = cc.id_cross_category AND cl.id_lang = ? AND cl.id_shop = 1
  LEFT JOIN ps_category_lang clf ON clf.id_category = cc.id_cross_category AND clf.id_lang = 1 AND clf.id_shop = 1
      WHERE cc.id_category = ?
      ORDER BY cc.position ASC, cc.id_cross_category ASC`,
    [idLang, leaf.id_category],
  ).catch(() => [])

  // Pour chaque cross, calcule son path canonique en remontant jusqu'au Home
  // PS (id=2). Le 1er slug de la chain est le pilier (ex: 'grossiste'), le
  // reste est le path interne (ex: 'olive/tapenades').
  interface CrossChild {
    id: number
    slug: string
    path: string
    label: string
    pilier: string
  }
  const crossChildren: CrossChild[] = []
  for (const cr of crossRows) {
    const chain = await loadAncestors(db, cr.id_category, /* pilierId = Home */ 2, idLang)
    if (chain.length < 1) continue
    const pilierSlug = chain[0].link_rewrite
    const innerPath = chain.slice(1).map((c) => c.link_rewrite).join('/')
    crossChildren.push({
      id: cr.id_category,
      slug: cr.link_rewrite,
      path: innerPath,
      label: cr.name,
      pilier: pilierSlug,
    })
  }

  // Product aggregate. For the 3 virtual categories (390/391/392), the
  // products are projected dynamically by /api/catalogue/by-category (not
  // wired in ps_category_product) → ad-hoc aggregate on dynamic scopes.
  // Otherwise: descendants via recursive CTE id_parent (nleft/nright may be
  // out of sync, id_parent remains the source of truth).
  const VIRTUAL = new Map<number, 'nouveautes' | 'promotions' | 'meilleures-ventes'>([
    [390, 'nouveautes'], [391, 'promotions'], [392, 'meilleures-ventes'],
  ])
  let agg: CategoryAggregate = { total: 0, price_min: null, price_max: null }
  try {
    const virtualKind = VIRTUAL.get(leaf.id_category)
    if (virtualKind === 'promotions') {
      const rows = await db.query<{ total: number; price_min: number | null; price_max: number | null }>(
        `SELECT COUNT(DISTINCT p.id_product) AS total,
                MIN(p.price) AS price_min, MAX(p.price) AS price_max
           FROM ps_product p
           JOIN ps_specific_price sp ON sp.id_product = p.id_product
            AND sp.reduction > 0
            AND (sp.\`from\` IS NULL OR sp.\`from\` <= NOW())
            AND (sp.\`to\`   IS NULL OR sp.\`to\`   >= NOW())
          WHERE p.active = 1`,
      )
      const r = rows[0]
      if (r) agg = {
        total: Number(r.total ?? 0),
        price_min: r.price_min !== null ? Number(r.price_min) : null,
        price_max: r.price_max !== null ? Number(r.price_max) : null,
      }
    } else if (virtualKind === 'meilleures-ventes') {
      const rows = await db.query<{ total: number; price_min: number | null; price_max: number | null }>(
        `SELECT COUNT(DISTINCT p.id_product) AS total,
                MIN(p.price) AS price_min, MAX(p.price) AS price_max
           FROM ps_product p
           JOIN (SELECT od.product_id
                   FROM ps_order_detail od
                   JOIN ps_orders o ON o.id_order = od.id_order
                  WHERE o.valid = 1 AND o.date_add >= DATE_SUB(NOW(), INTERVAL 90 DAY)
                  GROUP BY od.product_id) bs ON bs.product_id = p.id_product
          WHERE p.active = 1`,
      )
      const r = rows[0]
      if (r) agg = {
        total: Number(r.total ?? 0),
        price_min: r.price_min !== null ? Number(r.price_min) : null,
        price_max: r.price_max !== null ? Number(r.price_max) : null,
      }
    } else if (virtualKind === 'nouveautes') {
      const rows = await db.query<{ total: number; price_min: number | null; price_max: number | null }>(
        `SELECT COUNT(*) AS total, MIN(price) AS price_min, MAX(price) AS price_max
           FROM ps_product WHERE active = 1`,
      )
      const r = rows[0]
      if (r) agg = {
        total: Number(r.total ?? 0),
        price_min: r.price_min !== null ? Number(r.price_min) : null,
        price_max: r.price_max !== null ? Number(r.price_max) : null,
      }
    } else {
      const aggRows = await db.query<{ total: number; price_min: number | null; price_max: number | null }>(
        `WITH RECURSIVE cat_tree AS (
           SELECT id_category FROM ps_category WHERE id_category = ? AND active = 1
           UNION ALL
           SELECT c.id_category FROM ps_category c
           INNER JOIN cat_tree ct ON c.id_parent = ct.id_category
           WHERE c.active = 1
         )
         SELECT COUNT(DISTINCT p.id_product) AS total,
                MIN(p.price) AS price_min,
                MAX(p.price) AS price_max
           FROM cat_tree t
           JOIN ps_category_product cp ON cp.id_category = t.id_category
           JOIN ps_product p ON p.id_product = cp.id_product AND p.active = 1`,
        [leaf.id_category],
      )
      const r = aggRows[0]
      if (r) {
        agg = {
          total: Number(r.total ?? 0),
          price_min: r.price_min !== null ? Number(r.price_min) : null,
          price_max: r.price_max !== null ? Number(r.price_max) : null,
        }
      }
    }
  } catch (e: any) {
    console.error('[category] aggregate error:', e?.message)
  }

  // FAQ via ac_faq facade (parent_type='category')
  let faq: CategoryFaqItem[] = []
  try {
    const items = await listFaqsByParent('category', leaf.id_category, idLang, { event })
    faq = items
      .filter(it => it.question)
      .map(it => ({ position: it.position, question: it.question, answer_html: it.answer }))
  } catch (e: any) {
    if (e?.code !== 'ER_NO_SUCH_TABLE' && e?.errno !== 1146) {
      console.error('[category] FAQ error:', e?.message)
    }
  }

  const leafCustomH1 = await getCustomH1(db, leaf.id_category, idLang, event)
  const leafImages = buildImageUrls(leaf.id_category, await getMasterSlug(db, leaf.id_category))

  return {
    found: true,
    kind: 'category',
    pilier: pilierKey,
    id_category: leaf.id_category,
    id_parent: leaf.id_parent,
    level_depth: leaf.level_depth,
    path: localizedPath,
    slug: leaf.link_rewrite,
    name: leaf.name,
    h1: leafCustomH1 || leaf.name,
    meta_title: leaf.meta_title || `${leaf.name} — ${pilierLabel}`,
    meta_description: leaf.meta_description || '',
    intro_html: leaf.description,
    long_description_html: leaf.additional_description,
    image_url: leafImages.url,
    image_webp_srcset: leafImages.srcset,
    image_sizes: leafImages.sizes,
    breadcrumb,
    children: [
      ...childRows.map(r => ({
        id: r.id_category,
        slug: r.link_rewrite,
        path: `${localizedPath}/${r.link_rewrite}`,
        label: r.name,
      })),
      // Cross-categories at the end. Field `pilier` present only for
      // cross — the storefront uses it to build the canonical URL
      // (may differ from the host root category).
      ...crossChildren.map(c => ({
        id: c.id,
        slug: c.slug,
        path: c.path,
        label: c.label,
        pilier: c.pilier,
      })),
    ],
    aggregate: agg,
    faq,
  }
})
