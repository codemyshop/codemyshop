/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * POST /api/bo/quick-order/parse — Parse texte libre / CSV / email → paires (SKU, qty).
 *
 * Body : { text: string }
 *
 * Supported patterns (line by line):
 *   - "SKU;qty"      (CSV FR)
 *   - "SKU,qty"      (CSV EN)
 *   - "SKU\tqty"     (tabulation, copier-coller Excel)
 *   - "SKU qty"      (espace)
 *   - "SKU x qty"    (ex: "3611 x 10")
 *   - "qty x SKU"    (ex: "10 x 3611")
 *   - "SKU : qty"    (prose email)
 *   - "qty SKU"      (prose inverse)
 *
 * SKU is detected as an alphanumeric token (letters/digits/-/_).
 * Quantity is a number (integer or decimal, comma or period).
 * Unparsable lines returned in `skipped` for UI debug.
 */
export default defineEventHandler(async (event) => {
  const body = await readBody<{ text: string }>(event)
  const raw = String(body?.text || '').trim()

  if (!raw) {
    throw createError({ statusCode: 400, statusMessage: 'text requis' })
  }
  if (raw.length > 50000) {
    throw createError({ statusCode: 400, statusMessage: 'text trop long (> 50k car.)' })
  }

  const items: { sku: string; qty: number; source: string }[] = []
  const skipped: string[] = []

  const lines = raw.split(/\r?\n/)

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) continue
    if (line.startsWith('#') || line.startsWith('//')) continue

    const parsed = parseLine(line)
    if (parsed) {
      items.push(parsed)
    } else {
      skipped.push(line)
    }
  }

  return { ok: true, items, skipped, nbParsed: items.length, nbSkipped: skipped.length }
})

function parseLine(line: string): { sku: string; qty: number; source: string } | null {
  const patterns: { re: RegExp; skuIdx: number; qtyIdx: number; name: string }[] = [
    { re: /^([A-Za-z0-9_\-\.]+)\s*[;,\t]\s*(\d+(?:[.,]\d+)?)\s*$/, skuIdx: 1, qtyIdx: 2, name: 'csv' },
    { re: /^([A-Za-z0-9_\-\.]+)\s*[xX×]\s*(\d+(?:[.,]\d+)?)\s*$/, skuIdx: 1, qtyIdx: 2, name: 'sku-x-qty' },
    { re: /^(\d+(?:[.,]\d+)?)\s*[xX×]\s*([A-Za-z0-9_\-\.]+)\s*$/, skuIdx: 2, qtyIdx: 1, name: 'qty-x-sku' },
    { re: /^([A-Za-z0-9_\-\.]+)\s*:\s*(\d+(?:[.,]\d+)?)\s*$/, skuIdx: 1, qtyIdx: 2, name: 'sku:qty' },
    { re: /^([A-Za-z0-9_\-\.]+)\s+(\d+(?:[.,]\d+)?)\s*$/, skuIdx: 1, qtyIdx: 2, name: 'space' },
    { re: /^(\d+(?:[.,]\d+)?)\s+([A-Za-z0-9_\-\.]+)\s*$/, skuIdx: 2, qtyIdx: 1, name: 'qty-space-sku' },
  ]

  for (const p of patterns) {
    const m = line.match(p.re)
    if (m) {
      const sku = m[p.skuIdx]
      const qtyStr = m[p.qtyIdx].replace(',', '.')
      const qty = Number(qtyStr)
      if (sku && qty > 0) {
        return { sku, qty, source: p.name }
      }
    }
  }

  return null
}
