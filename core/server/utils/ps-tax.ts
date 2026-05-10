/**
 *
 * Helpers for displaying prices HT vs TTC according to tenant mode.
 *
 * Convention: a B2B tenant (PS_B2B_ENABLE=1, e.g. Example Shop wholesale) displays
 * prices HT by convention. A B2C tenant (PS_B2B_ENABLE=0/absent, e.g.
 * a tenant) displays prices TTC. PrestaShop storage is always HT
 * in `ps_product.price` — the markup is applied on the catalog query side
 * via JOIN `ps_tax`.
 *
 * Hardcodes `id_country = 8` (France): sufficient for France-only tenants
 * currently (various tenants). To be parameterized if we expand to DE/UK.
 */
import type { PgAdapterClient } from '~/server/utils/db-pg-adapter'

const TENANT_PG_FR_COUNTRY_ID = 8

/**
 * Reads `ps_configuration.PS_B2B_ENABLE`. True if =1, false otherwise (including
 * if the key doesn't exist — e.g. tenants where it was never initialized
 * → fallback B2C TTC).
 */
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

/**
 * Returns the LEFT JOINs `ps_product_shop`/`ps_tax_rule`/`ps_tax` to include
 * in the catalog query when displaying TTC (B2C). Returns ''
 * in B2B mode (HT, no tax JOIN).
 *
 * The caller must ensure that the `ps_product` table is aliased as `p`.
 */
export function buildTaxJoinForPrice(b2b: boolean): string {
  if (b2b) return ''
  return `
    LEFT JOIN ps_product_shop pst ON pst.id_product = p.id_product AND pst.id_shop = 1
    LEFT JOIN ps_tax_rule tr ON tr.id_tax_rules_group = pst.id_tax_rules_group
                            AND tr.id_country = ${TENANT_PG_FR_COUNTRY_ID}
    LEFT JOIN ps_tax tax ON tax.id_tax = tr.id_tax AND tax.active = 1
  `
}

/**
 * Returns the SQL expression to use for the display price from
 * a base column (typically `p.price` or `ps.price`). In B2C,
 * applies the VAT markup via `MAX(tax.rate)` (compatible with GROUP BY
 * thanks to the aggregate). In B2B, returns the raw column.
 */
export function buildPriceExpr(b2b: boolean, baseCol = 'p.price'): string {
  if (b2b) return baseCol
  return `ROUND(${baseCol} * (1 + COALESCE(MAX(tax.rate), 0) / 100), 2)`
}

/**
 * Non-aggregated variant for queries without GROUP BY (e.g. SELECT
 * DISTINCT). Utilise `tax.rate` directement.
 */
export function buildPriceExprNonAgg(b2b: boolean, baseCol = 'p.price'): string {
  if (b2b) return baseCol
  return `ROUND(${baseCol} * (1 + COALESCE(tax.rate, 0) / 100), 2)`
}
