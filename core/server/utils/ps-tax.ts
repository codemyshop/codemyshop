

import type { PgAdapterClient } from '~/server/utils/db-pg-adapter'

const TENANT_PG_FR_COUNTRY_ID = 8

export async function isTenantB2b(db: PgAdapterClient): Promise<boolean> {
  try {
    const row = await db.get<{ value: string }>(
      `SELECT value FROM ps_configuration WHERE name = ? LIMIT 1`,
      ['PS_B2B_ENABLE'],
    )
    return row?.value === '1'
  } catch {
    return false
  }
}

export function buildTaxJoinForPrice(b2b: boolean): string {
  if (b2b) return ''
  return `
    LEFT JOIN ps_product_shop pst ON pst.id_product = p.id_product AND pst.id_shop = 1
    LEFT JOIN ps_tax_rule tr ON tr.id_tax_rules_group = pst.id_tax_rules_group
                            AND tr.id_country = ${TENANT_PG_FR_COUNTRY_ID}
    LEFT JOIN ps_tax tax ON tax.id_tax = tr.id_tax AND tax.active = 1
  `
}

export function buildPriceExpr(b2b: boolean, baseCol = 'p.price'): string {
  if (b2b) return baseCol
  return `ROUND(${baseCol} * (1 + COALESCE(MAX(tax.rate), 0) / 100), 2)`
}

export function buildPriceExprNonAgg(b2b: boolean, baseCol = 'p.price'): string {
  if (b2b) return baseCol
  return `ROUND(${baseCol} * (1 + COALESCE(tax.rate, 0) / 100), 2)`
}
