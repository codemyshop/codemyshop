/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * GET /api/catalogue/suggest?q=datte&clientId=example-shop-v2&limit=12&lang=fr
 *
 * Multi-entity autocomplete (V2 of internal search).
 * Aggregates in parallel: products (native PS engine), categories (ps_category_lang
 * + buildCategoryPathMap for SEO URL pillar/path/slug), CMS pages (ps_cms_lang),
 * food vertical dictionary entries (cs_dictionary).
 *
 * Nitro cache 60s keyed on (clientId, q, lang, limit) to amortize
 * identical requests (auto-complete repeats the same request on each keystroke).
 *
 * Retour :
 *   {
 *     products:   [{ id, name, ref, price, priceRaw, image }],
 *     categories: [{ id, name, href }],
 *     cms:        [{ id, title, href }],
 *     dictionary: [{ slug, word, excerpt, href }]
 *   }
 */
import { useClientDbById } from '~/server/utils/db'
import { buildCategoryPathMap } from '~/server/utils/category-path'
import { resolveTenantPiliers } from '~/server/utils/tenant-piliers'
import { resolveIdLang } from '~/server/utils/lang'
import { buildProductImage } from '~/server/utils/ps-image'
import { searchDictionarySuggest } from '~/internal/dictionary/server/utils/dictionary'
import { deriveUnitPricing } from '~/server/utils/unity-label'
import { tenantHasUnitPricing } from '~/server/utils/tenant-vertical'

const fmtEur = (n: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n)

const CMS_MAX  = 3
const CAT_MAX  = 4
const DICT_MAX = 3
const PROD_MAX = 5

export default defineCachedEventHandler(async (event) => {
  const { q, clientId: qClientId } = getQuery(event)
  const term = String(q || '').trim()
  if (term.length < 2) {
    return { products: [], categories: [], cms: [], dictionary: [] }
  }

  const clientId = String(qClientId || 'ac-hub')
  const idLang = await resolveIdLang(event)
  const unitPricingEnabled = tenantHasUnitPricing(event)

  const db = useClientDbById(clientId)

  // ── ps_alias : map fautes/variantes → mot indexé (token-by-token) ─────
  // « cernau de noix » → « cerneaux de noix » avant LIKE.
  const rawTerms = term.split(/\s+/).filter(Boolean)
  let mappedTerm = term
  if (rawTerms.length) {
    try {
      const aliasRows = await db.query<{ alias: string; search: string }>(
        `SELECT alias, search FROM ps_alias WHERE active = 1
          AND LOWER(alias) IN (${rawTerms.map(() => '?').join(',')})`,
        rawTerms.map(t => t.toLowerCase()),
      )
      if (aliasRows.length) {
        const aliasMap = new Map(aliasRows.map(r => [r.alias.toLowerCase(), r.search]))
        mappedTerm = rawTerms.map(t => aliasMap.get(t.toLowerCase()) || t).join(' ')
      }
    } catch { /* ps_alias absent → pas de remapping */ }
  }
  const like = `%${mappedTerm}%`

  const [productsRes, categoriesRes, cmsRes, dictionaryRes] = await Promise.allSettled([
    // ── Products: direct DB (zero external service principle, 2026-04-22) ──────────────
    db.query<{ id_product: number; reference: string; name: string; link_rewrite: string; price: number; id_image: number | null; unit_price_ratio: number | null; unity: string | null; weight: number | null }>(
      // Strict PG: ORDER BY on SELECT DISTINCT must reference an alias present
      // in the SELECT list (see list.get.ts line 17). Sort on the `name` alias.
      // Added unit_price_ratio + unity + weight to calculate pricePerKg/HT-U
      `SELECT DISTINCT p.id_product, p.reference, ps.price,
              COALESCE(pl.name, plf.name, '') AS name,
              COALESCE(pl.link_rewrite, plf.link_rewrite, '') AS link_rewrite,
              p.unit_price_ratio, p.unity, p.weight,
              (SELECT id_image FROM ps_image WHERE id_product = p.id_product AND cover = 1 LIMIT 1) AS id_image
         FROM ps_product p
         JOIN ps_product_shop ps ON ps.id_product = p.id_product AND ps.id_shop = 1
    LEFT JOIN ps_product_lang pl  ON pl.id_product  = p.id_product AND pl.id_lang  = ? AND pl.id_shop = 1
    LEFT JOIN ps_product_lang plf ON plf.id_product = p.id_product AND plf.id_lang = 1 AND plf.id_shop = 1
        WHERE p.active = 1 AND ps.active = 1
          AND (pl.name ILIKE ? OR plf.name ILIKE ? OR p.reference ILIKE ?)
        ORDER BY name
        LIMIT ${PROD_MAX}`,
      [idLang, like, like, like],
    ).then((rows) => rows.map((r) => {
      const img = buildProductImage(r.id_image, r.link_rewrite)
      const priceHT = Number(r.price)
      // Unit price DB-First (without `Units per box` features which would require
      // too expensive a join for a 60s cache autocomplete) — fallback
      // unit_price_ratio + unity puis poids colis.
      const pricing = unitPricingEnabled
        ? deriveUnitPricing({
            priceHT,
            unitPriceRatio: r.unit_price_ratio,
            unity: r.unity,
            unitsPerPack: undefined,
            netWeightKg: undefined,
            productWeightKg: Number(r.weight || 0),
          })
        : { pricePerUnit: undefined, unitLabel: 'HT', divisor: undefined }
      return {
        id: Number(r.id_product),
        name: String(r.name),
        ref: String(r.reference || ''),
        price: fmtEur(priceHT),
        priceRaw: priceHT,
        pricePerUnitFormatted: pricing.pricePerUnit !== undefined ? fmtEur(pricing.pricePerUnit) : undefined,
        unitLabel: pricing.unitLabel,
        image: img?.src,
        imageSrcset: img?.srcset,
        imageFallback: img?.fallback,
        active: true,
      }
    })),

    // ── Categories: ps_category_lang (current language, fallback id_lang=1) ───────
    db.query<{ id_category: number; name: string }>(
      `SELECT c.id_category,
              COALESCE(cl.name, clf.name) AS name
       FROM ps_category c
       LEFT JOIN ps_category_lang cl  ON cl.id_category  = c.id_category AND cl.id_lang = ? AND cl.id_shop = 1
       LEFT JOIN ps_category_lang clf ON clf.id_category = c.id_category AND clf.id_lang = 1 AND clf.id_shop = 1
       WHERE c.active = 1 AND c.id_category > 2 AND (cl.name ILIKE ? OR clf.name ILIKE ?)
       ORDER BY LENGTH(COALESCE(cl.name, clf.name)) ASC
       LIMIT ${CAT_MAX}`,
      [idLang, like, like],
    ),

    // ── Pages CMS : ps_cms_lang (meta_title + meta_description) ─────────────────
    db.query<{ id_cms: number; meta_title: string; link_rewrite: string }>(
      `SELECT c.id_cms,
              COALESCE(cl.meta_title, clf.meta_title)     AS meta_title,
              COALESCE(cl.link_rewrite, clf.link_rewrite) AS link_rewrite
       FROM ps_cms c
       LEFT JOIN ps_cms_lang cl  ON cl.id_cms  = c.id_cms AND cl.id_lang = ? AND cl.id_shop = 1
       LEFT JOIN ps_cms_lang clf ON clf.id_cms = c.id_cms AND clf.id_lang = 1 AND clf.id_shop = 1
       WHERE c.active = 1 AND (cl.meta_title ILIKE ? OR clf.meta_title ILIKE ? OR cl.meta_description ILIKE ? OR clf.meta_description ILIKE ?)
       ORDER BY LENGTH(COALESCE(cl.meta_title, clf.meta_title)) ASC
       LIMIT ${CMS_MAX}`,
      [idLang, like, like, like, like],
    ),

    // ── Food vertical dictionary — via Drizzle adapter ──────────
    searchDictionarySuggest(mappedTerm, DICT_MAX, null, { clientId }),
  ])

  const products = productsRes.status === 'fulfilled' ? productsRes.value : []

  // SEO category URL resolution: pillar/path/slug via id_parent traversal.
  // Fallback /catalogue/:slug if the category is outside the pillars.
  let categories: Array<{ id: number; name: string; href: string }> = []
  if (categoriesRes.status === 'fulfilled' && categoriesRes.value.length) {
    const ids = categoriesRes.value.map(c => c.id_category)
    const piliers = await resolveTenantPiliers(event, db, idLang).catch(() => [])
    const pathMap = await buildCategoryPathMap(db, ids, idLang, piliers).catch(() => new Map())
    categories = categoriesRes.value.map(c => {
      const info = pathMap.get(c.id_category)
      const href = info?.pilier
        ? `/${info.pilier}/${info.path}`
        : `/catalogue/${c.id_category}`
      return { id: Number(c.id_category), name: c.name, href }
    })
  }

  const cms = cmsRes.status === 'fulfilled'
    ? cmsRes.value.map(c => ({
        id:    Number(c.id_cms),
        title: c.meta_title,
        href:  c.link_rewrite ? `/${c.link_rewrite}` : `/page/${c.id_cms}`,
      }))
    : []
  const dictionary = dictionaryRes.status === 'fulfilled'
    ? dictionaryRes.value.map(d => ({
        slug:    d.slug,
        word:    d.word,
        excerpt: d.excerpt,
        href:    `/dictionnaire/${d.slug}`,
      }))
    : []

  return { products, categories, cms, dictionary }
}, {
  maxAge: 60,             // 60s — auto-complete répète la même requête sur chaque frappe
  name:   'catalogue-suggest',
  getKey: (event) => {
    const q = getQuery(event)
    return `${String(q.clientId || 'ac-hub')}-${String(q.lang || 'fr')}-${String(q.q || '')}`
  },
})
