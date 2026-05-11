

import { useClientDbById, useClientDb } from '~/server/utils/db'
import { resolveIdLang } from '~/server/utils/lang'
import { buildProductImage } from '~/server/utils/ps-image'
import { isTenantB2b, buildTaxJoinForPrice, buildPriceExprNonAgg } from '~/server/utils/ps-tax'

interface ProductRow {
  id_product: number
  name: string
  link_rewrite: string
  reference: string
  description_short: string | null
  price: number
  id_image: number | null
  active: number
  date_add: string
}

const SORT_MAP: Record<string, string> = {
  name_asc:    'name ASC',
  name_desc:   'name DESC',
  price_asc:   'price ASC',
  price_desc:  'price DESC',
  date_desc:   'date_add DESC',
}

function parseFeatures(raw: string | undefined): Record<number, number[]> {
  if (!raw) return {}
  const out: Record<number, number[]> = {}
  for (const block of raw.split('|')) {
    const [fIdStr, valsStr] = block.split(':')
    const fId = Number(fIdStr)
    if (!fId || !valsStr) continue
    const vals = valsStr.split(',').map(Number).filter(Boolean)
    if (vals.length) out[fId] = vals
  }
  return out
}

function formatPrice(n: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n)
}

export default defineEventHandler(async (event) => {
  const psId = Number(getRouterParam(event, 'psId'))
  if (!psId || isNaN(psId)) throw createError({ statusCode: 400, message: 'psId invalide' })

  const q = getQuery(event)
  const page  = Math.max(Number(q.page)  || 1, 1)
  const limit = Math.min(Math.max(Number(q.limit) || 24, 1), 96)
  const offset = (page - 1) * limit
  const sort = SORT_MAP[(q.sort as string) || 'name_asc'] || SORT_MAP.name_asc
  const priceMin = q.priceMin !== undefined ? Number(q.priceMin) : undefined
  const priceMax = q.priceMax !== undefined ? Number(q.priceMax) : undefined
  const features = parseFeatures(q.f as string | undefined)

  const clientId = q.clientId as string | undefined
  const idLang = await resolveIdLang(event)
  const db = clientId ? useClientDbById(clientId) : useClientDb(event)

  
  const b2b = await isTenantB2b(db)
  const taxJoin = buildTaxJoinForPrice(b2b)
  const priceExpr = buildPriceExprNonAgg(b2b, 'ps.price')

  try {
    
    const catMeta = await db.get<{ nleft: number; nright: number }>(
      `SELECT nleft, nright FROM ps_category WHERE id_category = ? AND active = 1 LIMIT 1`,
      [psId],
    )
    if (!catMeta) {
      return { products: [], total: 0, page, limit, filters: [] }
    }

    
    const whereClauses: string[] = [
      'p.active = 1',
      'ps.active = 1',
      'd.nleft BETWEEN ? AND ?',
      'd.active = 1',
    ]
    const whereParams: any[] = [catMeta.nleft, catMeta.nright]

    if (priceMin !== undefined && priceMin > 0) {
      whereClauses.push('ps.price >= ?')
      whereParams.push(priceMin)
    }
    if (priceMax !== undefined && priceMax < 10000) {
      whereClauses.push('ps.price <= ?')
      whereParams.push(priceMax)
    }

    
    const featureJoins: string[] = []
    const featureParams: any[] = []
    let i = 0
    for (const [fIdStr, vals] of Object.entries(features)) {
      const fId = Number(fIdStr)
      if (!fId || !vals.length) continue
      const alias = `fp${i++}`
      featureJoins.push(
        `JOIN ps_feature_product ${alias} ON ${alias}.id_product = p.id_product
           AND ${alias}.id_feature = ?
           AND ${alias}.id_feature_value IN (${vals.map(() => '?').join(',')})`,
      )
      featureParams.push(fId, ...vals)
    }

    const whereSql = whereClauses.join(' AND ')
    const joinsSql = featureJoins.join(' ')

    
    const totalRow = await db.get<{ n: number }>(
      `SELECT COUNT(DISTINCT p.id_product) AS n
         FROM ps_product p
         JOIN ps_product_shop ps     ON ps.id_product = p.id_product AND ps.id_shop = 1
         JOIN ps_category_product cp ON cp.id_product = p.id_product
         JOIN ps_category d          ON d.id_category = cp.id_category
         ${joinsSql}
        WHERE ${whereSql}`,
      [...featureParams, ...whereParams],
    )
    const total = totalRow?.n ?? 0

    
    const rows = await db.query<ProductRow>(
      `SELECT DISTINCT p.id_product, p.reference, p.date_add AS date_add,
              COALESCE(pl.name, plf.name, '')                         AS name,
              COALESCE(pl.link_rewrite, plf.link_rewrite, '')         AS link_rewrite,
              COALESCE(pl.description_short, plf.description_short, '') AS description_short,
              ${priceExpr} AS price,
              p.active,
              (SELECT id_image FROM ps_image WHERE id_product = p.id_product AND cover = 1 LIMIT 1) AS id_image
         FROM ps_product p
         JOIN ps_product_shop ps     ON ps.id_product = p.id_product AND ps.id_shop = 1
         JOIN ps_category_product cp ON cp.id_product = p.id_product
         JOIN ps_category d          ON d.id_category = cp.id_category
    LEFT JOIN ps_product_lang pl    ON pl.id_product = p.id_product AND pl.id_lang = ? AND pl.id_shop = 1
    LEFT JOIN ps_product_lang plf   ON plf.id_product = p.id_product AND plf.id_lang = 1 AND plf.id_shop = 1
         ${joinsSql}
         ${taxJoin}
        WHERE ${whereSql}
     ORDER BY ${sort}
        LIMIT ? OFFSET ?`,
      [idLang, ...featureParams, ...whereParams, limit, offset],
    )

    const products = rows.map((r) => {
      const img = buildProductImage(r.id_image, r.link_rewrite)
      return {
        id: r.id_product,
        name: r.name,
        ref: r.reference,
        price: formatPrice(Number(r.price)),
        priceRaw: Number(r.price),
        image: img?.src,
        imageSrcset: img?.srcset,
        imageFallback: img?.fallback,
        active: r.active === 1,
        description_short: r.description_short || undefined,
      }
    })

    
    
    const filters: any[] = []

    return { products, total, page, limit, filters }
  } catch (err: any) {
    if (err?.code === 'ER_NO_SUCH_TABLE' || err?.errno === 1146) {
      return { products: [], total: 0, page, limit, filters: [] }
    }
    console.error('[catalogue/list] DB error:', err?.message, err?.sqlMessage)
    throw createError({ statusCode: 500, message: 'Erreur listing produits' })
  }
})
