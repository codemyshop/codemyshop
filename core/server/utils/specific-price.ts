

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

export function applySpecificPrice(priceHT: number, sp: ActiveSpecificPrice | undefined): number {
  if (!sp || sp.reduction <= 0) return priceHT
  if (sp.reductionType === 'percentage') return Math.max(0, priceHT * (1 - sp.reduction))
  return Math.max(0, priceHT - sp.reduction)
}

export function specificPriceLabel(sp: ActiveSpecificPrice): string {
  if (sp.reductionType === 'percentage') return `-${Math.round(sp.reduction * 100)}%`
  return `-${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(sp.reduction)}`
}

export async function getActiveSpecificPrices(
  productIds: number[],
  _ctx: SpContext = {},
): Promise<Map<number, ActiveSpecificPrice>> {
  const out = new Map<number, ActiveSpecificPrice>()
  if (!productIds.length) return out

  const ids = sql.join(productIds.map((id) => sql`${id}`), sql`, `)
  
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
