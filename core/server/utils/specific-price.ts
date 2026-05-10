/**
 *
 * Single helper to resolve active `ps_specific_price` on a list
 * of products. Used by cart-db (shopping cart) and orders-db (order creation)
 * to guarantee that the price applied to the cart = price applied to the order
 * = price displayed on the product card (catalogue/by-category).
 *
 * MVP scope: general promotions (no granularity by customer/group/country
 * for now). We reproduce the `MAX(reduction)` convention of
 * by-category.get.ts to stay aligned. Targeted promotions (by group,
 * by customer, by country) will be added if needed.
 */
import { sql } from 'drizzle-orm'
import { usePocPg } from '../db/drizzle-pg'

export interface ActiveSpecificPrice {
  reduction: number
  reductionType: 'percentage' | 'amount'
  fromQuantity: number
}

interface SpContext {
  event?: any
  clientId?: string
}

/**
 * Calculates the ex-tax price after promotion. If percentage, `reduction` is a ratio 0..1
 * (e.g. 0.20 = -20%). If amount, `reduction` is an amount in € (ex-tax).
 */
export function applySpecificPrice(priceHT: number, sp: ActiveSpecificPrice | undefined): number {
  if (!sp || sp.reduction <= 0) return priceHT
  if (sp.reductionType === 'percentage') return Math.max(0, priceHT * (1 - sp.reduction))
  return Math.max(0, priceHT - sp.reduction)
}

/**
 * Short label for promo badge: "-20%" or "-2.50 €".
 */
export function specificPriceLabel(sp: ActiveSpecificPrice): string {
  if (sp.reductionType === 'percentage') return `-${Math.round(sp.reduction * 100)}%`
  return `-${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(sp.reduction)}`
}

/**
 * Resolves active `ps_specific_price` for a list of products.
 * Filtre :
 *   - reduction > 0
 * - valid time window (NULL or bounds enclosing NOW())
 * - id_product_attribute = 0 (no targeted combination — MVP)
 * Selection: MAX(reduction) per product (consistent with by-category).
 */
export async function getActiveSpecificPrices(
  productIds: number[],
  _ctx: SpContext = {},
): Promise<Map<number, ActiveSpecificPrice>> {
  const out = new Map<number, ActiveSpecificPrice>()
  if (!productIds.length) return out

  const ids = sql.join(productIds.map((id) => sql`${id}`), sql`, `)
  // PG : "from" / "to" sont des mots-clés SQL réservés → quote double obligatoire.
  const result = await usePocPg().execute(sql`
    SELECT id_product, reduction, reduction_type, from_quantity
      FROM cs_main.ps_specific_price
     WHERE id_product IN (${ids})
       AND reduction > 0
       AND id_product_attribute = 0
       AND ("from" IS NULL OR "from" <= NOW())
       AND ("to"   IS NULL OR "to"   >= NOW())
  `).catch(() => null)
  if (!result) return out

  // Une fois remontées, on garde la plus grosse réduction par produit
  // (un même produit peut avoir plusieurs lignes — by-quantity, by-group…
  // qu'on n'a pas filtrées finement en SQL pour rester simple).
  for (const r of (result as any[])) {
    const pid = Number(r.id_product)
    const reduction = Number(r.reduction || 0)
    const reductionType: 'percentage' | 'amount' =
      String(r.reduction_type) === 'amount' ? 'amount' : 'percentage'
    const fromQuantity = Math.max(1, Number(r.from_quantity || 1))
    const prev = out.get(pid)
    if (!prev || reduction > prev.reduction) {
      out.set(pid, { reduction, reductionType, fromQuantity })
    }
  }
  return out
}
