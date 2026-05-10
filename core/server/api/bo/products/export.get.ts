/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { useClientDb } from '~/server/utils/db'

/**
 * GET /api/bo/products/export — CSV of all products in the current tenant.
 *
 * Columns: ID, Name, Reference, EAN13, Net Price, Stock, Default Category.
 * Separator `;` (French Excel standard) + UTF-8 BOM so accents
 * display correctly when opening with Excel/LibreOffice.
 */
export default defineEventHandler(async (event) => {
  const db = useClientDb(event)

  const rows = await db.query<any>(`
    SELECT
      p.id_product    AS id,
      pl.name         AS name,
      p.reference     AS reference,
      p.ean13         AS ean13,
      ROUND(p.price, 6) AS priceHT,
      COALESCE(sa.quantity, 0) AS stock,
      COALESCE(cl.name, '')    AS categoryName
    FROM ps_product p
    LEFT JOIN ps_product_lang pl
      ON pl.id_product = p.id_product AND pl.id_lang = 1 AND pl.id_shop = 1
    LEFT JOIN ps_category_lang cl
      ON cl.id_category = p.id_category_default AND cl.id_lang = 1 AND cl.id_shop = 1
    LEFT JOIN ps_stock_available sa
      ON sa.id_product = p.id_product AND sa.id_product_attribute = 0
    ORDER BY p.id_product ASC
  `)

  const headers = ['ID', 'Nom', 'Référence', 'EAN13', 'Prix HT', 'Stock', 'Catégorie']

  const esc = (v: any) => {
    const s = v === null || v === undefined ? '' : String(v)
    // Quote si contient `;`, `"`, retour ligne ; double les `"` internes.
    if (/[;"\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"'
    return s
  }

  const lines: string[] = []
  lines.push(headers.join(';'))
  for (const r of rows) {
    lines.push([
      r.id,
      esc(r.name),
      esc(r.reference),
      esc(r.ean13),
      Number(r.priceHT ?? 0).toFixed(2),
      Number(r.stock ?? 0),
      esc(r.categoryName),
    ].join(';'))
  }

  // BOM UTF-8 pour Excel FR
  const csv = '\ufeff' + lines.join('\r\n')

  const filename = `products-export-${new Date().toISOString().slice(0, 10)}.csv`
  setResponseHeader(event, 'Content-Type', 'text/csv; charset=utf-8')
  setResponseHeader(event, 'Content-Disposition', `attachment; filename="${filename}"`)
  return csv
})
