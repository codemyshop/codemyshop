/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * GET /api/catalogue/manufacturers
 *
 * Brand list (ps_manufacturer) with active product count.
 * Multi-tenant via useClientDb.
 */
import { useClientDb, resolveClientId } from '~/server/utils/db'
import { resolveIdLang } from '~/server/utils/lang'

interface ManufacturerRow {
  id_manufacturer: number
  name: string
  short_description: string | null
  meta_title: string | null
  meta_description: string | null
  nb_products: number
}


export default defineEventHandler(async (event) => {
  const db = useClientDb(event)
  const idLang = await resolveIdLang(event)

  try {
    const rows = await db.query<ManufacturerRow>(
      `SELECT m.id_manufacturer, m.name,
              ml.short_description, ml.meta_title, ml.meta_description,
              COUNT(p.id_product) AS nb_products
       FROM ps_manufacturer m
       LEFT JOIN ps_manufacturer_lang ml ON ml.id_manufacturer = m.id_manufacturer AND ml.id_lang = ?
       LEFT JOIN ps_product p ON p.id_manufacturer = m.id_manufacturer AND p.active = 1
       WHERE m.active = 1
       GROUP BY m.id_manufacturer, m.name, ml.short_description, ml.meta_title, ml.meta_description
       HAVING COUNT(p.id_product) > 0
       ORDER BY nb_products DESC`,
      [idLang],
    )

    const base = useRuntimeConfig().public.psFrontUrl as string || ''

    return {
      manufacturers: rows.map(r => ({
        id: r.id_manufacturer,
        name: r.name,
        slug: slugify(r.name),
        description: r.short_description || '',
        metaTitle: r.meta_title || '',
        metaDescription: r.meta_description || '',
        nbProducts: Number(r.nb_products),
        logo: `${base}/img/m/${r.id_manufacturer}.jpg`,
      })),
    }
  } catch (err: any) {
    console.error('[manufacturers] DB error:', err?.message)
    return { manufacturers: [] }
  }
})

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}
