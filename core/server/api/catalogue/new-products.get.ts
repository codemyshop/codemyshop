/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * GET /api/catalogue/new-products?clientId=example-shop-v2&limit=8
 *
 * Returns the most recently added products (sorted by date_add DESC).
 * Direct database only (doctrine "Zero PrestaShop webservice" 2026-04-22).
 */
import { useClientDb, resolveClientId } from '~/server/utils/db'
import { resolveIdLang } from '~/server/utils/lang'
import { buildProductUrl, buildImageUrl, buildImageSrcset } from '~/server/utils/product-urls'
import { buildCategoryPathMap, buildProductUrlFromCategory } from '~/server/utils/category-path'
import { resolveTenantPiliers } from '~/server/utils/tenant-piliers'
import { localizeRootSegment } from '~/utils/locale-route-roots'

interface NewProductRow {
  id: number
  ref: string | null
  name: string
  link_rewrite: string | null
  description_short: string | null
  priceRaw: number
  id_image: number | null
  id_category_default: number | null
}

interface NewProduct {
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

const fmtEur = (n: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n)

export default defineEventHandler(async (event): Promise<{ products: NewProduct[] }> => {
  const { clientId, limit } = getQuery(event)
  const tenant = String(clientId || resolveClientId(event) || 'ac-hub')
  const lim = Math.min(Math.max(Number(limit) || 8, 1), 24)

  // Essai DB direct (pattern Example Shop v2 — cohérent avec promotions / best-sellers)
  try {
    const db = useClientDb(event)
    const idLang = await resolveIdLang(event)
    const rows = await db.query<NewProductRow>(
      `SELECT p.id_product AS id,
              p.reference AS ref,
              pl.name AS name,
              pl.link_rewrite AS link_rewrite,
              pl.description_short AS description_short,
              p.price AS priceRaw,
              p.id_category_default AS id_category_default,
              img.id_image AS id_image
         FROM ps_product p
         JOIN ps_product_lang pl ON pl.id_product = p.id_product AND pl.id_lang = ?
         LEFT JOIN ps_image img ON img.id_product = p.id_product AND img.cover = 1
        WHERE p.active = 1
        ORDER BY p.date_add DESC
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

    const products: NewProduct[] = rows.map(r => {
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
        price: fmtEur(price),
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
    console.error('[new-products] error:', err?.message)
    return { products: [] }
  }
})
