

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
    } catch {  }
  }
  const like = `%${mappedTerm}%`

  const [productsRes, categoriesRes, cmsRes, dictionaryRes] = await Promise.allSettled([
    
    db.query<{ id_product: number; reference: string; name: string; link_rewrite: string; price: number; id_image: number | null; unit_price_ratio: number | null; unity: string | null; weight: number | null }>(
      
      
      
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

    
    searchDictionarySuggest(mappedTerm, DICT_MAX, null, { clientId }),
  ])

  const products = productsRes.status === 'fulfilled' ? productsRes.value : []

  
  
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
  maxAge: 60,             
  name:   'catalogue-suggest',
  getKey: (event) => {
    const q = getQuery(event)
    return `${String(q.clientId || 'ac-hub')}-${String(q.lang || 'fr')}-${String(q.q || '')}`
  },
})
