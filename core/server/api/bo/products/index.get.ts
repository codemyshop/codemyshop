

import { useClientDb } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const q = getQuery(event) as Record<string, string>
  const page = Math.max(1, Number(q.page || 1))
  const perPage = Math.min(10000, Math.max(1, Number(q.perPage || 100)))
  const search = (q.search || '').trim()
  const categoryId = q.category ? Number(q.category) : 0
  const sort = q.sort || 'id'
  const dir = q.dir === 'ASC' ? 'ASC' : 'DESC'
  const db = useClientDb(event)

  try {
    const conditions: string[] = []
    const params: any[] = []

    if (search) {
      
      
      conditions.push(`(pl.name ILIKE ? OR p.reference ILIKE ? OR p.ean13 ILIKE ? OR CAST(p.id_product AS TEXT) ILIKE ?)`)
      const s = `%${search}%`
      params.push(s, s, s, s)
    }
    if (categoryId) {
      conditions.push(`p.id_category_default = ?`)
      params.push(categoryId)
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

    const countRow = await db.get<any>(`
      SELECT COUNT(*) AS total FROM ps_product p
      LEFT JOIN ps_product_lang pl ON pl.id_product = p.id_product AND pl.id_lang = 1 AND pl.id_shop = 1
      ${where}
    `, params)

    const total = countRow?.total ?? 0
    const offset = (page - 1) * perPage

    const sortMap: Record<string, string> = {
      id: 'p.id_product', name: 'pl.name', price: 'p.price', stock: 'sa.quantity', date: 'p.date_add',
    }
    const orderClause = `ORDER BY ${sortMap[sort] || 'p.id_product'} ${dir}`

    const products = await db.query<any>(`
      SELECT
        p.id_product AS id, pl.name, p.reference, p.ean13,
        pl.link_rewrite AS linkRewrite,
        ROUND(p.price, 2) AS priceHT,
        ROUND(p.unit_price_ratio, 4) AS unitPriceRatio,
        p.unity,
        ROUND(p.weight, 3) AS weight,
        p.active,
        p.id_category_default AS categoryId,
        COALESCE(cl.name, '') AS categoryName,
        COALESCE(sa.quantity, 0) AS stock,
        p.date_add AS dateAdd,
        (SELECT pi.id_image FROM ps_image pi WHERE pi.id_product = p.id_product AND pi.cover = 1 LIMIT 1) AS coverImageId
      FROM ps_product p
      LEFT JOIN ps_product_lang pl ON pl.id_product = p.id_product AND pl.id_lang = 1 AND pl.id_shop = 1
      LEFT JOIN ps_category_lang cl ON cl.id_category = p.id_category_default AND cl.id_lang = 1 AND cl.id_shop = 1
      LEFT JOIN ps_stock_available sa ON sa.id_product = p.id_product AND sa.id_product_attribute = 0
      ${where}
      ${orderClause}
      LIMIT ? OFFSET ?
    `, [...params, perPage, offset])

    
    
    
    
    const { buildProductImage } = await import('~/server/utils/ps-image')
    for (const p of products) {
      const img = buildProductImage(p.coverImageId, p.linkRewrite)
      p.imageUrl = img?.src ?? null
    }

    
    if (products.length) {
      const productIds = products.map((p: any) => p.id)
      const placeholders = productIds.map(() => '?').join(',')
      const allImages = await db.query<any>(`
        SELECT id_product, id_image FROM ps_image
        WHERE id_product IN (${placeholders})
        ORDER BY id_product, position, id_image
      `, productIds)

      const imagesByProduct = new Map<number, number[]>()
      for (const img of allImages) {
        if (!imagesByProduct.has(img.id_product)) imagesByProduct.set(img.id_product, [])
        imagesByProduct.get(img.id_product)!.push(img.id_image)
      }
      for (const p of products) {
        p.imageIds = imagesByProduct.get(p.id) || []
      }
    }

    return { products, total, page, perPage, totalPages: Math.ceil(total / perPage) }
  } catch (err: any) {
    console.error('[bo/products] DB error:', err?.message)
    return { products: [], total: 0, page, perPage, totalPages: 0 }
  }
})
