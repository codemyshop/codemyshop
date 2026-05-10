/**
 *
 * GET /api/catalogue/promotions?limit=8
 *
 * Returns products currently on promotion (ps_specific_price with
 * reduction > 0 and open time window). Direct DB read via
 * useClientDb (pattern Example Shop v2 — cf homepage-sections / contact).
 *
 * Tenant-aware: limited to example-shop-v2 for now.
 */
import { useClientDb, resolveClientId } from '~/server/utils/db'
import { resolveIdLang } from '~/server/utils/lang'
import { buildProductUrl, buildImageUrl, buildImageSrcset } from '~/server/utils/product-urls'
import { buildCategoryPathMap, buildProductUrlFromCategory } from '~/server/utils/category-path'
import { resolveTenantPiliers } from '~/server/utils/tenant-piliers'
import { localizeRootSegment } from '~/utils/locale-route-roots'

interface PromotionRow {
  id: number
  ref: string | null
  name: string
  link_rewrite: string | null
  description_short: string | null
  priceRaw: number
  id_image: number | null
  id_category_default: number | null
  reduction: number
  reduction_type: 'amount' | 'percentage'
}

interface PromotionProduct {
  id: number
  ref: string
  name: string
  url: string
  descriptionShort?: string
  price: string
  priceRaw: number
  pricePromo: string
  pricePromoRaw: number
  reductionLabel: string
  image?: string
  imageLarge?: string
  imageSrcset?: string
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&[a-z]+;/gi, ' ').replace(/\s+/g, ' ').trim()
}

const fmtEur = (n: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n)

export default defineEventHandler(async (event): Promise<{ products: PromotionProduct[] }> => {
  const tenant = resolveClientId(event)
  if (!tenant) {
    return { products: [] }
  }

  const { limit } = getQuery(event)
  const lim = Math.min(Math.max(Number(limit) || 8, 1), 24)
  const db = useClientDb(event)
  const idLang = await resolveIdLang(event)

  try {
    const rows = await db.query<PromotionRow>(
      // ⚠️ ps_product n'a PAS de colonne id_default_image (cf découverte 1.8).
      // L'image cover vit dans ps_image (cover=1).
      `SELECT p.id_product AS id,
              p.reference AS ref,
              pl.name AS name,
              pl.link_rewrite AS link_rewrite,
              pl.description_short AS description_short,
              p.price AS priceRaw,
              p.id_category_default AS id_category_default,
              img.id_image AS id_image,
              MAX(sp.reduction) AS reduction,
              MAX(sp.reduction_type) AS reduction_type
         FROM ps_specific_price sp
         JOIN ps_product p ON p.id_product = sp.id_product
         JOIN ps_product_lang pl ON pl.id_product = p.id_product AND pl.id_lang = ?
         LEFT JOIN ps_image img ON img.id_product = p.id_product AND img.cover = 1
        WHERE p.active = 1
          AND sp.reduction > 0
          AND (sp.\`from\` IS NULL OR sp.\`from\` <= NOW())
          AND (sp.\`to\`   IS NULL OR sp.\`to\`   >= NOW())
        GROUP BY p.id_product
        ORDER BY reduction DESC, p.id_product DESC
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

    const products: PromotionProduct[] = rows.map(r => {
      const price = Number(r.priceRaw || 0)
      const reduction = Number(r.reduction || 0)
      const isPct = r.reduction_type === 'percentage'
      const pricePromoRaw = isPct ? price * (1 - reduction) : Math.max(0, price - reduction)
      const reductionLabel = isPct ? `-${Math.round(reduction * 100)}%` : `-${fmtEur(reduction)}`
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
        pricePromo: fmtEur(pricePromoRaw),
        pricePromoRaw,
        reductionLabel,
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
    console.error('[promotions] DB error:', err?.message)
    return { products: [] }
  }
})
