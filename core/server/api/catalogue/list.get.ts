/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * GET /api/catalogue/list — Product list with filters/sorting/pagination.
 * Query: ?clientId=...&categoryId=3&page=1&limit=24&sort=price_asc&priceMin=5&priceMax=100&q=pistache
 *
 * Functional alias of /api/catalogue/:psId/list (which requires the id in the path) —
 * This endpoint accepts categoryId in query for more flexible use cases. Direct
 * database (doctrine "Zero PrestaShop webservice" 2026-04-22). Refactoring
 * depuis connector.listProducts.
 */
import { useClientDb, useClientDbById } from '~/server/utils/db'
import { resolveIdLang } from '~/server/utils/lang'
import { buildProductImage } from '~/server/utils/ps-image'
import { isTenantB2b, buildTaxJoinForPrice, buildPriceExprNonAgg } from '~/server/utils/ps-tax'

// PG strict (SELECT DISTINCT) : ORDER BY doit référencer un alias présent
// dans le SELECT. `pl.name` est masqué par `COALESCE(pl.name, plf.name) AS name`,
// donc on trie sur l'alias `name`. `price` et `date_add` sont alias-isés ci-dessous.
const SORT_MAP: Record<string, string> = {
  name_asc:   'name ASC',
  name_desc:  'name DESC',
  price_asc:  'price ASC',
  price_desc: 'price DESC',
  date_desc:  'date_add DESC',
}

const fmtEur = (n: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n)

export default defineEventHandler(async (event) => {
  const q = getQuery(event) as Record<string, string>
  const categoryId = q.categoryId ? Number(q.categoryId) : undefined
  const page = Math.max(Number(q.page) || 1, 1)
  const limit = Math.min(Math.max(Number(q.limit) || 24, 1), 96)
  const offset = (page - 1) * limit
  const sort = SORT_MAP[q.sort || 'name_asc'] || SORT_MAP.name_asc
  const priceMin = q.priceMin ? Number(q.priceMin) : undefined
  const priceMax = q.priceMax ? Number(q.priceMax) : undefined
  const query = q.q?.trim() || undefined

  const idLang = await resolveIdLang(event)
  const db = q.clientId ? useClientDbById(String(q.clientId)) : useClientDb(event)

  // B2B → HT, B2C → TTC. Cf. core/server/utils/ps-tax.ts.
  const b2b = await isTenantB2b(db)
  const taxJoin = buildTaxJoinForPrice(b2b)
  const priceExpr = buildPriceExprNonAgg(b2b, 'ps.price')

  const whereClauses: string[] = ['p.active = 1', 'ps.active = 1']
  const params: any[] = []
  const joins: string[] = []

  if (categoryId) {
    const cat = await db.get<{ nleft: number; nright: number }>(
      `SELECT nleft, nright FROM ps_category WHERE id_category = ? AND active = 1 LIMIT 1`,
      [categoryId],
    )
    if (!cat) return { products: [], total: 0, page, limit, filters: [] }
    joins.push('JOIN ps_category_product cp ON cp.id_product = p.id_product')
    joins.push('JOIN ps_category d ON d.id_category = cp.id_category')
    whereClauses.push('d.nleft BETWEEN ? AND ?', 'd.active = 1')
    params.push(cat.nleft, cat.nright)
  }
  if (priceMin !== undefined && priceMin > 0) { whereClauses.push('ps.price >= ?'); params.push(priceMin) }
  if (priceMax !== undefined && priceMax < 10000) { whereClauses.push('ps.price <= ?'); params.push(priceMax) }
  if (query) {
    const like = `%${query.replace(/[%_]/g, '\\$&')}%`
    whereClauses.push('(pl.name LIKE ? OR p.reference LIKE ?)')
    params.push(like, like)
  }

  try {
    const totalRow = await db.get<{ n: number }>(
      `SELECT COUNT(DISTINCT p.id_product) AS n
         FROM ps_product p
         JOIN ps_product_shop ps ON ps.id_product = p.id_product AND ps.id_shop = 1
    LEFT JOIN ps_product_lang pl ON pl.id_product = p.id_product AND pl.id_lang = ? AND pl.id_shop = 1
         ${joins.join(' ')}
        WHERE ${whereClauses.join(' AND ')}`,
      [idLang, ...params],
    )
    const total = totalRow?.n ?? 0

    const rows = await db.query<any>(
      `SELECT DISTINCT p.id_product, p.reference, p.date_add AS date_add,
              COALESCE(pl.name, plf.name, '')                           AS name,
              COALESCE(pl.description_short, plf.description_short, '') AS description_short,
              COALESCE(pl.link_rewrite, plf.link_rewrite, '')           AS link_rewrite,
              ${priceExpr} AS price,
              (SELECT id_image FROM ps_image WHERE id_product = p.id_product AND cover = 1 LIMIT 1) AS id_image
         FROM ps_product p
         JOIN ps_product_shop ps ON ps.id_product = p.id_product AND ps.id_shop = 1
    LEFT JOIN ps_product_lang pl  ON pl.id_product  = p.id_product AND pl.id_lang  = ? AND pl.id_shop = 1
    LEFT JOIN ps_product_lang plf ON plf.id_product = p.id_product AND plf.id_lang = 1 AND plf.id_shop = 1
         ${joins.join(' ')}
         ${taxJoin}
        WHERE ${whereClauses.join(' AND ')}
     ORDER BY ${sort}
        LIMIT ? OFFSET ?`,
      [idLang, ...params, limit, offset],
    )

    const products = rows.map((r: any) => {
      const img = buildProductImage(r.id_image, r.link_rewrite)
      return {
        id: Number(r.id_product),
        name: String(r.name || ''),
        ref: String(r.reference || ''),
        price: fmtEur(Number(r.price)),
        priceRaw: Number(r.price),
        image: img?.src,
        imageSrcset: img?.srcset,
        imageFallback: img?.fallback,
        active: true,
        description_short: r.description_short || undefined,
      }
    })

    return { products, total, page, limit, filters: [] }
  } catch (err: any) {
    if (err?.code === 'ER_NO_SUCH_TABLE' || err?.errno === 1146) {
      return { products: [], total: 0, page, limit, filters: [] }
    }
    console.error('[catalogue/list] DB error:', err?.message)
    return { products: [], total: 0, page, limit, filters: [] }
  }
})
