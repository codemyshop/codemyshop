

import { useClientDb, resolveClientId } from '~/server/utils/db'
import { resolveIdLang } from '~/server/utils/lang'
import { buildProductUrl, buildImageUrl, buildImageSrcset } from '~/server/utils/product-urls'
import { buildCategoryPathMap, buildProductUrlFromCategory } from '~/server/utils/category-path'
import { resolveTenantPiliers } from '~/server/utils/tenant-piliers'
import { localizeRootSegment } from '~/utils/locale-route-roots'
import { isTenantB2b, buildTaxJoinForPrice, buildPriceExpr } from '~/server/utils/ps-tax'

interface BestSellerRow {
  id: number
  ref: string | null
  name: string
  link_rewrite: string | null
  description_short: string | null
  priceRaw: number
  id_image: number | null
  id_category_default: number | null
  qty_sold: number
}

interface BestSellerProduct {
  id: number
  ref: string
  name: string
  url: string
  descriptionShort?: string
  price: string
  priceRaw: number
  image?: string
  imageLarge?: string
  imageSrcset?: string
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&[a-z]+;/gi, ' ').replace(/\s+/g, ' ').trim()
}

export default defineEventHandler(async (event): Promise<{ products: BestSellerProduct[] }> => {
  const tenant = resolveClientId(event)
  if (!tenant) {
    return { products: [] }
  }

  const { limit } = getQuery(event)
  const lim = Math.min(Math.max(Number(limit) || 8, 1), 24)
  const db = useClientDb(event)
  const idLang = await resolveIdLang(event)

  
  const b2b = await isTenantB2b(db)
  const taxJoin = buildTaxJoinForPrice(b2b)
  const priceExpr = buildPriceExpr(b2b, 'p.price')

  try {
    const rows = await db.query<BestSellerRow>(
      
      
      
      
      `SELECT od.product_id AS id,
              p.reference AS ref,
              pl.name AS name,
              pl.link_rewrite AS link_rewrite,
              pl.description_short AS description_short,
              ${priceExpr} AS priceRaw,
              p.id_category_default AS id_category_default,
              img.id_image AS id_image,
              SUM(od.product_quantity) AS qty_sold
         FROM ps_order_detail od
         JOIN ps_orders o ON o.id_order = od.id_order
         JOIN ps_product p ON p.id_product = od.product_id
         JOIN ps_product_lang pl ON pl.id_product = p.id_product AND pl.id_lang = ?
         LEFT JOIN ps_image img ON img.id_product = p.id_product AND img.cover = 1
         ${taxJoin}
        WHERE p.active = 1
          AND o.valid = 1
          AND o.date_add >= DATE_SUB(NOW(), INTERVAL 90 DAY)
        GROUP BY od.product_id, p.id_product, p.reference, p.price,
                 p.id_category_default, pl.name, pl.link_rewrite,
                 pl.description_short, img.id_image
        ORDER BY qty_sold DESC
        LIMIT ?`,
      [idLang, lim],
    )

    const piliers = await resolveTenantPiliers(event, db, idLang)
    const idCats = [...new Set(rows.map(r => Number(r.id_category_default)).filter(Boolean))]
    const pathMap = await buildCategoryPathMap(db, idCats, idLang, piliers)
    const langRow = await db.get<{ iso_code: string }>(
      `SELECT iso_code FROM ps_lang WHERE id_lang = ? LIMIT 1`, [idLang],
    )
    const iso = langRow?.iso_code || 'fr'
    const langPrefix = iso && iso !== 'fr' ? `/${iso}` : ''
    const prefixesByPilier: Record<string, string> = {}
    for (const p of piliers) prefixesByPilier[p.slug] = localizeRootSegment(p.slug, iso)

    const products: BestSellerProduct[] = rows.map(r => {
      const price = Number(r.priceRaw || 0)
      const imgId = Number(r.id_image || 0)
      const descShort = r.description_short ? stripHtml(r.description_short).slice(0, 180) : undefined
      const slug = r.link_rewrite || ''
      const url = slug && Number(r.id_category_default)
        ? buildProductUrlFromCategory(Number(r.id_category_default), slug, pathMap, { prefixesByPilier, langPrefix, productId: Number(r.id) })
        : buildProductUrl(Number(r.id), slug)
      return {
        id: Number(r.id),
        ref: r.ref || '',
        name: r.name,
        url,
        descriptionShort: descShort || undefined,
        price: new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(price),
        priceRaw: price,
        image:       buildImageUrl(imgId, 'home',  slug, tenant),
        imageLarge:  buildImageUrl(imgId, 'large', slug, tenant),
        imageSrcset: buildImageSrcset(imgId, slug),
      }
    })

    return { products }
  } catch (err: any) {
    if (err?.code === 'ER_NO_SUCH_TABLE' || err?.errno === 1146) {
      return { products: [] }
    }
    console.error('[best-sellers] DB error:', err?.message)
    return { products: [] }
  }
})
