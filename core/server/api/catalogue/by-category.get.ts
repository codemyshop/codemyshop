/**
 *
 * GET /api/catalogue/by-category?id_category=209&offset=0&limit=24
 *
 * Returns products of a native PS category (and its descendants via
 * recursive CTE on id_parent) with pagination + sorting + MDM filters + JOIN
 * features (packaging/caliber/net weight/units per carton).
 *
 * Primary key: id_category (numeric, stable, language-agnostic — backlog
 * #155 merge 2026-04-19).
 *
 * Virtual categories:
 * - 390 new items         → date_add DESC on all active products
 *   - 391 promotions         → JOIN ps_specific_price reduction > 0 actif
 * - 392 best sellers  → JOIN order_detail aggregation 90-day rolling
 */
import { useClientDb, resolveClientId } from '~/server/utils/db'
import { resolveIdLang } from '~/server/utils/lang'
import { buildImageUrl, buildImageSrcset } from '~/server/utils/product-urls'
import { localizeRootSegment } from '~/utils/locale-route-roots'
import { buildCategoryPathMap as buildCategoryPathMapShared, type CategoryPathInfo } from '~/server/utils/category-path'
import { resolveTenantPiliers, type ResolvedPilier } from '~/server/utils/tenant-piliers'
import { isTenantB2b, buildTaxJoinForPrice, buildPriceExpr } from '~/server/utils/ps-tax'
import {
  canonicalizeCountry,
  detectAllergens,
  parseOriginFilter,
  parseAllergensFilter,
} from '~/server/utils/food-mdm-facets'
import { listFoodSpecsForProductIds } from '~/enterprise/vertical-food/product-food/server/utils/product-food'
import { deriveUnitPricing } from '~/server/utils/unity-label'
import { tenantHasUnitPricing } from '~/server/utils/tenant-vertical'

const VIRTUAL_CATEGORIES = {
  390: 'nouveautes',
  391: 'promotions',
  392: 'meilleures-ventes',
} as const

// Les IDs de piliers sont tenant-dépendants → résolus dynamiquement par slug
// (link_rewrite) au lieu du hardcode. Cache en mémoire par slug.
const pilierIdCache = new Map<string, number | null>()

async function resolvePilierId(db: any, slug: string): Promise<number | null> {
  if (!slug) return null
  if (pilierIdCache.has(slug)) return pilierIdCache.get(slug)!
  const row = await db.get<{ id_category: number }>(
    `SELECT c.id_category FROM ps_category c
       JOIN ps_category_lang cl ON cl.id_category = c.id_category AND cl.id_lang = 1 AND cl.id_shop = 1
      WHERE cl.link_rewrite = ? AND c.active = 1
      ORDER BY c.level_depth ASC, c.id_category ASC LIMIT 1`,
    [slug],
  )
  const id = row?.id_category ?? null
  pilierIdCache.set(slug, id)
  return id
}

interface ProductCard {
  id: number
  ref: string
  ean13?: string
  name: string
  slug: string
  price: string
  priceRaw: number
  image?: string
  imageSrcset?: string
  url: string
  format?: string
  netWeight?: string
  packaging?: string
  caliber?: string
  unitsPerPack?: number
  totalWeightKg?: number
  pricePerKg?: number
  pricePerKgFormatted?: string
  /** Suffixe court à afficher après le prix unitaire (HT/K, HT/L, HT/U).
   * DB-first derived from `p.unity` + features (cf. unity-label.ts). */
  unitLabel?: string
  pricePromo?: string
  pricePromoRaw?: number
  pricePerKgPromo?: number
  pricePerKgPromoFormatted?: string
  savingsRaw?: number
  savingsFormatted?: string
  reductionLabel?: string
}

interface ByCategoryResponse {
  products: ProductCard[]
  total: number
  offset: number
  limit: number
  hasMore: boolean
}

type SortKey =
  | 'relevance'
  | 'price-asc' | 'price-desc'
  | 'weight-asc' | 'weight-desc'
  | 'price-kg-asc' | 'price-kg-desc'
  | 'ref-asc' | 'ref-desc'
  | 'name-asc' | 'name-desc'
  | 'ean13-asc' | 'ean13-desc'

const fmtEur = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n)

function parseWeightToKg(s: string | null | undefined): number | null {
  if (!s) return null
  const m = String(s).trim().toLowerCase().replace(',', '.').match(/^([\d.]+)\s*(kg|g)$/)
  if (!m) return null
  const n = Number(m[1])
  if (!Number.isFinite(n) || n <= 0) return null
  return m[2] === 'kg' ? n : n / 1000
}

/**
 * Wrapper on the shared version: returns the short path (truncate based on
 * pillar config) WITH the detected pillar from the default category. mapRowToCard
 * uses this pillar to generate a direct canonical URL (avoids a superfluous 301
 * redirect when a product displayed in /grossiste/X/ has its default category
 * under /marque/).
 */
async function buildCategoryPathMap(
  db: any,
  ids: number[],
  idLang: number,
  piliers: ResolvedPilier[],
): Promise<Map<number, CategoryPathInfo>> {
  return buildCategoryPathMapShared(db, ids, idLang, piliers)
}

export default defineEventHandler(async (event): Promise<ByCategoryResponse> => {
  const tenant = resolveClientId(event)
  const q = getQuery(event)
  const idCategory = Number(q.id_category ?? q.idCategory ?? 0)
  const offset = Math.max(0, Number(q.offset) || 0)
  const limit = Math.min(Math.max(Number(q.limit) || 24, 1), 1000)
  const rawSort = String(q.sort ?? 'relevance') as SortKey

  if (!Number.isFinite(idCategory) || idCategory <= 0) {
    return { products: [], total: 0, offset, limit, hasMore: false }
  }

  const db = useClientDb(event)
  const idLang = await resolveIdLang(event)

  // B2B = HT, B2C = TTC. SMOKE v2 (PS_B2B_ENABLE absent/0) → TTC ;
  // Example Shop / AC grossiste (PS_B2B_ENABLE=1) → HT.
  const b2b = await isTenantB2b(db)
  const taxJoin = buildTaxJoinForPrice(b2b)
  const priceExpr = buildPriceExpr(b2b, 'p.price')

  // Pilier : prefix URL = slug du pilier tel quel (lowercase). Résolution id via
  // link_rewrite. Fallback sur 'grossiste' pour compat Example Shop si absent.
  const pilierParam = String(q.pilier ?? 'grossiste').toLowerCase().replace(/[^a-z0-9-]/g, '')
  const pilierId = (await resolvePilierId(db, pilierParam)) ?? 0
  const prefixFr = pilierParam || 'grossiste'

  // Liste des piliers tenant — résolue une fois et passée aux pathMap callers.
  const tenantPiliers = await resolveTenantPiliers(event, db, idLang)
  const unitPricingEnabled = tenantHasUnitPricing(event)

  const langRow = await db.get<{ iso_code: string }>(
    `SELECT iso_code FROM ps_lang WHERE id_lang = ? LIMIT 1`,
    [idLang],
  )
  const iso = langRow?.iso_code || 'fr'
  const langPrefix = iso && iso !== 'fr' ? `/${iso}` : ''
  const prefix = localizeRootSegment(prefixFr, iso)

  // Filtres MDM
  const originFilter = parseOriginFilter(q.origin as string | undefined)
  const allergenFilter = parseAllergensFilter(q.allergens as string | undefined)
  const hasMdmFilter = originFilter.size > 0 || allergenFilter.size > 0

  const virtualKind = (VIRTUAL_CATEGORIES as Record<number, string>)[idCategory] ?? null

  // ── SQL ORDER BY commun ────────────────────────────────────────────────
  // Relevance : priorité à la position dans la cat EXACTE demandée (le user
  // peut la réordonner via /hub/products/merchandising). Fallback MIN(position)
  // sur le subtree pour les produits qui ne sont que dans des sous-cats.
  // MariaDB sort NULL en premier avec ASC → IS NULL en discriminant pour
  // pousser les sub-cat-only en fin de liste.
  const SQL_ORDER: Record<SortKey, string | null> = {
    'relevance':     `MIN(CASE WHEN cp.id_category = ${idCategory} THEN cp.position END) IS NULL, MIN(CASE WHEN cp.id_category = ${idCategory} THEN cp.position END) ASC, MIN(cp.position) ASC, p.id_product ASC`,
    'price-asc':     'p.price ASC, p.id_product ASC',
    'price-desc':    'p.price DESC, p.id_product ASC',
    'weight-asc':    'p.weight ASC, p.id_product ASC',
    'weight-desc':   'p.weight DESC, p.id_product ASC',
    'price-kg-asc':  null,
    'price-kg-desc': null,
    'ref-asc':       'p.reference ASC, p.id_product ASC',
    'ref-desc':      'p.reference DESC, p.id_product ASC',
    'name-asc':      'pl.name ASC, p.id_product ASC',
    'name-desc':     'pl.name DESC, p.id_product ASC',
    'ean13-asc':     'p.ean13 ASC, p.id_product ASC',
    'ean13-desc':    'p.ean13 DESC, p.id_product ASC',
  }
  const sort: SortKey = (rawSort in SQL_ORDER) ? rawSort : 'relevance'
  const useSqlPagination = SQL_ORDER[sort] !== null

  // ── Virtual categories (nouveautes / promotions / meilleures-ventes) ──
  if (virtualKind) {
    return handleVirtualCategory(
      db, idLang, virtualKind, offset, limit, sort,
      { iso, langPrefix, prefix, tenant, pilierId, tenantPiliers, unitPricingEnabled },
    )
  }

  // ── Catégorie réelle : descendants via CTE récursive ─────────────────
  try {
    // 1. Total (distinct products sur tout l'arbre)
    const totalRows = await db.query<{ total: number }>(
      `WITH RECURSIVE cat_tree AS (
         SELECT id_category FROM ps_category WHERE id_category = ? AND active = 1
         UNION ALL
         SELECT c.id_category FROM ps_category c
         INNER JOIN cat_tree ct ON c.id_parent = ct.id_category
         WHERE c.active = 1
       )
       SELECT COUNT(DISTINCT p.id_product) AS total
         FROM cat_tree t
         JOIN ps_category_product cp ON cp.id_category = t.id_category
         JOIN ps_product p ON p.id_product = cp.id_product AND p.active = 1`,
      [idCategory],
    )
    const total = Number(totalRows[0]?.total ?? 0)
    if (total === 0) return { products: [], total: 0, offset, limit, hasMore: false }

    // 2. Filtre MDM pré-calculé si actif (fetch specs sur IDs autorisés)
    let filteredIds: number[] | null = null
    let filteredTotal = total
    if (hasMdmFilter) {
      const allIdsRows = await db.query<{ id_product: number }>(
        `WITH RECURSIVE cat_tree AS (
           SELECT id_category FROM ps_category WHERE id_category = ? AND active = 1
           UNION ALL
           SELECT c.id_category FROM ps_category c
           INNER JOIN cat_tree ct ON c.id_parent = ct.id_category
           WHERE c.active = 1
         )
         SELECT DISTINCT p.id_product
           FROM cat_tree t
           JOIN ps_category_product cp ON cp.id_category = t.id_category
           JOIN ps_product p ON p.id_product = cp.id_product AND p.active = 1`,
        [idCategory],
      )
      const allIds = allIdsRows.map(r => Number(r.id_product))
      if (!allIds.length) return { products: [], total: 0, offset, limit, hasMore: false }
      const specs = await listFoodSpecsForProductIds(allIds, { event })
      const specMap = new Map(specs.map(s => [s.idProduct, s]))
      filteredIds = allIds.filter(id => {
        const spec = specMap.get(id)
        if (!spec) return false
        if (originFilter.size) {
          const c = canonicalizeCountry(spec.countryOrigin)
          if (!c || !originFilter.has(c)) return false
        }
        if (allergenFilter.size) {
          const detected = detectAllergens(spec.allergensJson)
          let match = false
          for (const a of allergenFilter) { if (detected.has(a)) { match = true; break } }
          if (!match) return false
        }
        return true
      })
      filteredTotal = filteredIds.length
      if (!filteredTotal) return { products: [], total: 0, offset, limit, hasMore: false }
    }

    // 3. Slice paginé (JOIN features par nom, portable multi-tenant)
    const mdmPh = filteredIds?.length ? filteredIds.map(() => '?').join(',') : ''
    const mdmClause = mdmPh ? ` AND p.id_product IN (${mdmPh})` : ''
    const mdmParams = filteredIds ?? []
    const orderBy = SQL_ORDER[sort] ?? 'p.id_product ASC'
    const sqlLimit = useSqlPagination ? limit : 2000
    const sqlOffset = useSqlPagination ? offset : 0

    const rows = await db.query<any>(
      `WITH RECURSIVE cat_tree AS (
         SELECT id_category FROM ps_category WHERE id_category = ? AND active = 1
         UNION ALL
         SELECT c.id_category FROM ps_category c
         INNER JOIN cat_tree ct ON c.id_parent = ct.id_category
         WHERE c.active = 1
       )
       SELECT p.id_product AS id,
              p.reference  AS ref,
              p.ean13      AS ean13,
              p.id_category_default AS id_category_default,
              pl.name         AS name,
              pl.link_rewrite AS link_rewrite,
              ${priceExpr} AS priceRaw,
              p.weight AS weightKg,
              p.unit_price_ratio AS unitPriceRatio,
              p.unity            AS unity,
              img.id_image AS id_image,
              MAX(CASE WHEN fl.name = 'Conditionnement'  THEN fvl.value END) AS packaging,
              MAX(CASE WHEN fl.name = 'Calibre'          THEN fvl.value END) AS caliber,
              MAX(CASE WHEN fl.name = 'Unités par colis' THEN fvl.value END) AS unitsPerPack,
              MAX(CASE WHEN fl.name = 'Poids net'        THEN fvl.value END) AS netWeight,
              MAX(sp.reduction)      AS reduction,
              MAX(sp.reduction_type) AS reduction_type
         FROM cat_tree t
         JOIN ps_category_product cp ON cp.id_category = t.id_category
         JOIN ps_product p  ON p.id_product = cp.id_product AND p.active = 1
         JOIN ps_product_lang pl ON pl.id_product = p.id_product AND pl.id_lang = ?
    LEFT JOIN ps_image img ON img.id_product = p.id_product AND img.cover = 1
    LEFT JOIN ps_feature_product fp ON fp.id_product = p.id_product
    LEFT JOIN ps_feature_lang fl
           ON fl.id_feature = fp.id_feature AND fl.id_lang = ?
          AND fl.name IN ('Conditionnement', 'Calibre', 'Unités par colis', 'Poids net')
    LEFT JOIN ps_feature_value_lang fvl
           ON fvl.id_feature_value = fp.id_feature_value AND fvl.id_lang = ?
    LEFT JOIN ps_specific_price sp ON sp.id_product = p.id_product
          AND sp.reduction > 0
          AND (sp."from" IS NULL OR sp."from" <= NOW())
          AND (sp."to"   IS NULL OR sp."to"   >= NOW())
         ${taxJoin}
        WHERE 1=1${mdmClause}
        GROUP BY p.id_product, p.reference, p.ean13, p.id_category_default,
                 pl.name, pl.link_rewrite, p.price, p.weight, p.date_add,
                 img.id_image
        ORDER BY ${orderBy}
        LIMIT ? OFFSET ?`,
      [idCategory, idLang, idLang, idLang, ...mdmParams, sqlLimit, sqlOffset],
    )

    // Path map pour URLs produit (primary category de chaque produit)
    // + résolution du path de la cat parcourue (contextCatPath) pour fallback URL
    const idCategoriesToResolve = [
      ...new Set([idCategory, ...rows.map(r => Number(r.id_category_default))].filter(Boolean)),
    ]
    const pathMap = await buildCategoryPathMap(db, idCategoriesToResolve, idLang, tenantPiliers)
    const contextCatPath = pathMap.get(idCategory)?.path || ''

    // priceMode='promo' systématique sur tous les listings (pas seulement
    // /promotions/) — les rows incluent désormais reduction/reduction_type
    // via LEFT JOIN ps_specific_price actif. Si reduction = 0 / NULL,
    // mapRowToCard ne génère pas de pricePromo (sera filtré côté condition).
    const products = rows.map(r => mapRowToCard(r, {
      langPrefix, prefix, tenant, pathMap, pilierId,
      priceMode: Number(r.reduction || 0) > 0 ? 'promo' : 'standard',
      contextCatPath, unitPricingEnabled,
    }))

    let finalProducts = products
    if (!useSqlPagination) {
      const dir = sort === 'price-kg-asc' ? 1 : -1
      const INF = Number.POSITIVE_INFINITY
      finalProducts = [...products].sort((a, b) => {
        const av = a.pricePerKg ?? INF
        const bv = b.pricePerKg ?? INF
        return av === bv ? a.id - b.id : (av - bv) * dir
      }).slice(offset, offset + limit)
    }

    return {
      products: finalProducts,
      total: filteredTotal,
      offset,
      limit,
      hasMore: offset + finalProducts.length < filteredTotal,
    }
  } catch (err: any) {
    console.error('[by-category] DB error:', err?.message)
    return { products: [], total: 0, offset, limit, hasMore: false }
  }
})

async function handleVirtualCategory(
  db: any,
  idLang: number,
  kind: 'nouveautes' | 'promotions' | 'meilleures-ventes',
  offset: number,
  limit: number,
  sort: SortKey,
  ctx: { iso: string; langPrefix: string; prefix: string; tenant: string | null; pilierId: number; tenantPiliers: ResolvedPilier[]; unitPricingEnabled: boolean },
): Promise<ByCategoryResponse> {
  const isPromo = kind === 'promotions'
  const isBestSellers = kind === 'meilleures-ventes'

  // B2B → HT, B2C → TTC. Cf. core/server/utils/ps-tax.ts.
  const b2b = await isTenantB2b(db)
  const taxJoin = buildTaxJoinForPrice(b2b)
  const priceExpr = buildPriceExpr(b2b, 'p.price')

  // Sentinel MariaDB `'0000-00-00 00:00:00'` invalide en PG : la migration
  // MariaDB→PG (chantier #44) a converti ces valeurs en NULL. `IS NULL`
  // fonctionne sur les deux SGBD.
  const promoJoin = isPromo
    ? `JOIN ps_specific_price sp ON sp.id_product = p.id_product
       AND sp.reduction > 0
       AND (sp.\`from\` IS NULL OR sp.\`from\` <= NOW())
       AND (sp.\`to\`   IS NULL OR sp.\`to\`   >= NOW())`
    : ''

  const bestSellersJoin = isBestSellers
    ? `JOIN (SELECT od.product_id, SUM(od.product_quantity) AS qty_sold
              FROM ps_order_detail od
              JOIN ps_orders o ON o.id_order = od.id_order
             WHERE o.valid = 1 AND o.date_add >= DATE_SUB(NOW(), INTERVAL 90 DAY)
             GROUP BY od.product_id) bs ON bs.product_id = p.id_product`
    : ''

  const defaultOrder = isPromo
    ? 'MAX(sp.reduction) DESC, p.id_product DESC'
    : isBestSellers
      ? 'MAX(bs.qty_sold) DESC, p.id_product DESC'
      : 'p.date_add DESC, p.id_product DESC'
  const orderMap: Record<SortKey, string | null> = {
    'relevance':     defaultOrder,
    'price-asc':     'p.price ASC, p.id_product ASC',
    'price-desc':    'p.price DESC, p.id_product ASC',
    'weight-asc':    'p.weight ASC, p.id_product ASC',
    'weight-desc':   'p.weight DESC, p.id_product ASC',
    'ref-asc':       'p.reference ASC, p.id_product ASC',
    'ref-desc':      'p.reference DESC, p.id_product ASC',
    'name-asc':      'pl.name ASC, p.id_product ASC',
    'name-desc':     'pl.name DESC, p.id_product ASC',
    'ean13-asc':     'p.ean13 ASC, p.id_product ASC',
    'ean13-desc':    'p.ean13 DESC, p.id_product ASC',
    'price-kg-asc':  null,
    'price-kg-desc': null,
  }
  const orderBy = orderMap[sort] ?? defaultOrder
  const useSqlPagination = orderMap[sort] !== null
  const sqlLimit = useSqlPagination ? limit : 2000
  const sqlOffset = useSqlPagination ? offset : 0

  const selectExtra = isPromo
    ? ', MAX(sp.reduction) AS reduction, MAX(sp.reduction_type) AS reduction_type'
    : isBestSellers ? ', MAX(bs.qty_sold) AS qty_sold' : ''

  try {
    const totalRows = await db.query<{ total: number }>(
      `SELECT COUNT(DISTINCT p.id_product) AS total
         FROM ps_product p
         ${promoJoin}
         ${bestSellersJoin}
        WHERE p.active = 1`,
    )
    const total = Number(totalRows[0]?.total ?? 0)
    if (!total) return { products: [], total: 0, offset, limit, hasMore: false }

    const rows = await db.query<any>(
      `SELECT p.id_product AS id,
              p.reference  AS ref,
              p.ean13      AS ean13,
              p.id_category_default AS id_category_default,
              pl.name         AS name,
              pl.link_rewrite AS link_rewrite,
              ${priceExpr} AS priceRaw,
              p.weight AS weightKg,
              p.unit_price_ratio AS unitPriceRatio,
              p.unity            AS unity,
              img.id_image AS id_image,
              MAX(CASE WHEN fl.name = 'Conditionnement'  THEN fvl.value END) AS packaging,
              MAX(CASE WHEN fl.name = 'Calibre'          THEN fvl.value END) AS caliber,
              MAX(CASE WHEN fl.name = 'Unités par colis' THEN fvl.value END) AS unitsPerPack,
              MAX(CASE WHEN fl.name = 'Poids net'        THEN fvl.value END) AS netWeight
              ${selectExtra}
         FROM ps_product p
         JOIN ps_product_lang pl ON pl.id_product = p.id_product AND pl.id_lang = ?
    LEFT JOIN ps_image img ON img.id_product = p.id_product AND img.cover = 1
    LEFT JOIN ps_feature_product fp ON fp.id_product = p.id_product
    LEFT JOIN ps_feature_lang fl
           ON fl.id_feature = fp.id_feature AND fl.id_lang = ?
          AND fl.name IN ('Conditionnement', 'Calibre', 'Unités par colis', 'Poids net')
    LEFT JOIN ps_feature_value_lang fvl
           ON fvl.id_feature_value = fp.id_feature_value AND fvl.id_lang = ?
         ${promoJoin}
         ${bestSellersJoin}
         ${taxJoin}
        WHERE p.active = 1
        GROUP BY p.id_product, p.reference, p.ean13, p.id_category_default,
                 pl.name, pl.link_rewrite, p.price, p.weight, p.date_add,
                 img.id_image
        ORDER BY ${orderBy}
        LIMIT ? OFFSET ?`,
      [idLang, idLang, idLang, sqlLimit, sqlOffset],
    )

    const idCategoriesToResolve = [
      ...new Set(rows.map(r => Number(r.id_category_default)).filter(Boolean)),
    ]
    const pathMap = await buildCategoryPathMap(db, idCategoriesToResolve, idLang, ctx.tenantPiliers)
    const products = rows.map(r => mapRowToCard(r, {
      langPrefix: ctx.langPrefix, prefix: ctx.prefix, tenant: ctx.tenant,
      pathMap, pilierId: ctx.pilierId, priceMode: isPromo ? 'promo' : 'standard',
      unitPricingEnabled: ctx.unitPricingEnabled,
    }))

    let finalProducts = products
    if (!useSqlPagination) {
      const dir = sort === 'price-kg-asc' ? 1 : -1
      const INF = Number.POSITIVE_INFINITY
      finalProducts = [...products].sort((a, b) => {
        const av = a.pricePerKg ?? INF
        const bv = b.pricePerKg ?? INF
        return av === bv ? a.id - b.id : (av - bv) * dir
      }).slice(offset, offset + limit)
    }

    return {
      products: finalProducts,
      total,
      offset,
      limit,
      hasMore: offset + finalProducts.length < total,
    }
  } catch (err: any) {
    console.error(`[by-category/virtual:${kind}] error:`, err?.message)
    return { products: [], total: 0, offset, limit, hasMore: false }
  }
}

function mapRowToCard(
  r: any,
  ctx: {
    langPrefix: string
    prefix: string
    tenant: string | null
    pathMap: Map<number, CategoryPathInfo>
    pilierId: number
    priceMode: 'standard' | 'promo'
    contextCatPath?: string  // path de la cat actuellement parcourue (fallback URL si default cassée)
    /** Active calcul prix/kg + label HT/K. False sur tenants non-food
     * (example shop skate, general ecommerce) — cf. tenant-vertical.ts. */
    unitPricingEnabled: boolean
  },
): ProductCard {
  const price = Number(r.priceRaw || 0)
  const imgId = Number(r.id_image || 0)
  const slug = r.link_rewrite || `produit-${r.id}`
  // Slug suffixed by id_product to guarantee uniqueness (cf. buildProductUrlFromCategory).
  // Aligns with the tenant convention (commit example-shop-url-flat).
  const slugWithId = `${slug}-${r.id}`
  const catDefault = Number(r.id_category_default || 0)
  const info = ctx.pathMap.get(catDefault)
  const catPath = info?.path || ''
  const piller = info?.pilier ?? ctx.prefix
  const url = catPath
    ? `${ctx.langPrefix}/${piller}/${catPath}/${slugWithId}`
    : info?.pilier
      ? `${ctx.langPrefix}/${info.pilier}/${slugWithId}`
      : ctx.contextCatPath
        ? `${ctx.langPrefix}/${ctx.prefix}/${ctx.contextCatPath}/${slugWithId}`
        : `${ctx.langPrefix}/produit/${r.id}-${slug}`

  const weightKg = r.weightKg != null ? Number(r.weightKg) : undefined
  const unitsRaw = r.unitsPerPack ? Number(r.unitsPerPack) : NaN
  const unitsPerPack = Number.isFinite(unitsRaw) && unitsRaw > 1 ? unitsRaw : undefined

  // Weight format makes sense only on food tenants (e.g.: 500g, 12×200g…).
  // On skate/fashion/general, product weight has no commercial interest
  // → we don't calculate format and the 500g pill doesn't appear.
  let format: string | undefined
  if (ctx.unitPricingEnabled) {
    if (unitsPerPack && r.netWeight) format = `${unitsPerPack} × ${r.netWeight}`
    else if (r.netWeight) format = r.netWeight
    else if (weightKg && weightKg > 0) {
      format = weightKg < 1
        ? `${Math.round(weightKg * 1000)}g`
        : weightKg < 10
          ? `${weightKg.toFixed(weightKg % 1 === 0 ? 0 : 1).replace('.', ',')}kg`
          : `${Math.round(weightKg)}kg`
    }
  }

  const netWeightKg = parseWeightToKg(r.netWeight)
  // Source of truth DB-first (cf. core/server/utils/unity-label.ts):
  // multi-pack → price per unit (exc. tax/U); else `unit_price_ratio` × `unity`;
  // else fallback to weight. `pricePerKg` keeps its name for frontend compat,
  // but semantically represents «price per unit of sale» (kg / L / piece).
  const totalNetKg = unitsPerPack && netWeightKg ? unitsPerPack * netWeightKg : netWeightKg
  // Non-food tenants (skate, general ecommerce): no price/kg calculation.
  // ProductCard then falls back to simple price rendering (template v-else).
  const { pricePerUnit: pricePerKg, unitLabel, divisor: unitDivisor } = ctx.unitPricingEnabled
    ? deriveUnitPricing({
        priceHT: price,
        unitPriceRatio: r.unitPriceRatio,
        unity: r.unity,
        unitsPerPack,
        netWeightKg: totalNetKg,
        productWeightKg: weightKg,
      })
    : { pricePerUnit: undefined, unitLabel: 'HT', divisor: undefined }
  // Legacy `totalWeightKg` is preserved in the card for backwards compat
  // (note: semantic = price divisor, regardless of unit).
  const totalWeightKg = unitDivisor

  const card: ProductCard = {
    id: Number(r.id),
    ref: r.ref || '',
    ean13: r.ean13 || undefined,
    name: r.name,
    slug,
    price: fmtEur(price),
    priceRaw: price,
    image: buildImageUrl(imgId, 'home', r.link_rewrite, ctx.tenant ?? undefined),
    imageSrcset: buildImageSrcset(imgId, r.link_rewrite),
    url,
    format,
    netWeight: r.netWeight || undefined,
    packaging: r.packaging || undefined,
    caliber: r.caliber || undefined,
    unitsPerPack,
    totalWeightKg,
    pricePerKg,
    pricePerKgFormatted: pricePerKg !== undefined ? fmtEur(pricePerKg) : undefined,
    unitLabel,
  }

  if (ctx.priceMode === 'promo') {
    const reduction = Number(r.reduction || 0)
    const isPct = r.reduction_type === 'percentage'
    const pricePromoRaw = isPct ? price * (1 - reduction) : Math.max(0, price - reduction)
    card.pricePromo = fmtEur(pricePromoRaw)
    card.pricePromoRaw = pricePromoRaw
    card.reductionLabel = isPct ? `-${Math.round(reduction * 100)}%` : `-${fmtEur(reduction)}`
    if (totalWeightKg && totalWeightKg > 0) {
      const pricePerKgPromoRaw = pricePromoRaw / totalWeightKg
      card.pricePerKgPromo = pricePerKgPromoRaw
      card.pricePerKgPromoFormatted = fmtEur(pricePerKgPromoRaw)
    }
    const savingsRaw = Math.max(0, price - pricePromoRaw)
    card.savingsRaw = savingsRaw
    card.savingsFormatted = fmtEur(savingsRaw)
  }

  return card
}
