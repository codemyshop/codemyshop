

import { useClientDb, useClientDbById } from '~/server/utils/db'
import { resolveIdLang } from '~/server/utils/lang'
import { buildProductImage } from '~/server/utils/ps-image'

const fmtEur = (n: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n)

export default defineEventHandler(async (event) => {
  const psId = Number(getRouterParam(event, 'psId'))
  if (!psId || isNaN(psId)) throw createError({ statusCode: 400, message: 'psId invalide' })

  const { limit = '50', clientId } = getQuery(event)
  const lim = Math.min(Math.max(Number(limit) || 50, 1), 200)
  const idLang = await resolveIdLang(event)
  const db = clientId ? useClientDbById(String(clientId)) : useClientDb(event)

  try {
    const rows = await db.query<any>(
      `SELECT p.id_product, p.reference, ps.price,
              COALESCE(pl.name, plf.name, '') AS name,
              COALESCE(pl.link_rewrite, plf.link_rewrite, '') AS link_rewrite,
              (SELECT id_image FROM ps_image WHERE id_product = p.id_product AND cover = 1 LIMIT 1) AS id_image
         FROM ps_product p
         JOIN ps_product_shop ps     ON ps.id_product = p.id_product AND ps.id_shop = 1
         JOIN ps_category_product cp ON cp.id_product = p.id_product AND cp.id_category = ?
    LEFT JOIN ps_product_lang pl  ON pl.id_product  = p.id_product AND pl.id_lang  = ? AND pl.id_shop = 1
    LEFT JOIN ps_product_lang plf ON plf.id_product = p.id_product AND plf.id_lang = 1 AND plf.id_shop = 1
        WHERE p.active = 1 AND ps.active = 1
        ORDER BY cp.position, pl.name
        LIMIT ?`,
      [psId, idLang, lim],
    )

    return rows.map((r: any) => {
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
      }
    })
  } catch (err: any) {
    if (err?.code === 'ER_NO_SUCH_TABLE' || err?.errno === 1146) return []
    console.error('[catalogue/:psId/products] DB error:', err?.message)
    return []
  }
})
