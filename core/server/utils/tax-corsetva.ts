/**
 *
 * TypeScript utility for Corsican VAT (5.5% → 2.1% on certain tax_rules_group
 * for addresses 20xxx). On the modern stack, replaces the module
 * PHP `legacy-modules/aude/ac_corsetva/` which runs on bare-metal.
 *
 * Source of truth: `cs_main.cs_corsetva` (schema-pg/corsetva.ts).
 * One row = one override (id_tax_rules_group, id_country, zipcode_from..to,
 * id_tax_target). If a delivery address matches the range, the target tax
 * replaces the native `ps_tax_rule` resolution for the relevant tax_rules_group.
 *
 * The call site is `getTaxRatesForProducts` in cart-db.ts — this module is
 * wired as post-processing: we first fetch the default rates, then
 * we apply matching overrides if the order is going to Corsica.
 *
 * Note: Corsican VAT law takes the delivery address
 * as reference (place of consumption), not billing. This is aligned
 * with the `id_address_delivery` already used by cart-db.ts.
 */
import { sql } from 'drizzle-orm'
import { usePocPg } from '../db/drizzle-pg'

/** id_country FR dans ps_country natif PS — typiquement 8. */
const DEFAULT_FR_COUNTRY_ID = 8

interface CorseOverrideRow {
  id_tax_rules_group: number
  id_country: number
  zipcode_from: string
  zipcode_to: string
  id_tax_target: number
  rate_target: number | string
}

/** Process-local cache: the corsetva table rarely changes, we avoid one round-trip per cart. */
let cachedRules: CorseOverrideRow[] | null = null
let cachedAt = 0
const CACHE_TTL_MS = 60_000 // 1 min

async function loadRules(): Promise<CorseOverrideRow[]> {
  const now = Date.now()
  if (cachedRules && now - cachedAt < CACHE_TTL_MS) return cachedRules
  const rows = await usePocPg().execute(sql`
    SELECT c.id_tax_rules_group,
           c.id_country,
           c.zipcode_from,
           c.zipcode_to,
           c.id_tax_target,
           t.rate AS rate_target
      FROM cs_main.cs_corsetva c
      JOIN cs_main.ps_tax t ON t.id_tax = c.id_tax_target AND t.active = 1
  `).catch(() => [] as any[])
  cachedRules = (Array.isArray(rows) ? rows : (rows as any).rows ?? []) as CorseOverrideRow[]
  cachedAt = now
  return cachedRules
}

/** Force a reload on the next call — used after toggling an override. */
export function invalidateCorseCache(): void {
  cachedRules = null
  cachedAt = 0
}

/**
 * True if the (postcode, countryId) pair falls within a defined Corsican range
 * for the given tax_rules_group. Textual range: we do lexicographic comparison
 * on 5 characters, which works for the 20000-20999 range without padding/parsing.
 */
function matchesCorseRange(
  rule: CorseOverrideRow,
  postcode: string,
  countryId: number,
): boolean {
  if (rule.id_country !== countryId) return false
  if (!postcode) return false
  const pc = postcode.trim()
  return pc >= rule.zipcode_from && pc <= rule.zipcode_to
}

/**
 * Applies Corsican overrides to a Map of rates per product.
 *
 * `productTaxGroups` : Map id_product → id_tax_rules_group. Permet d'identifier
 * which cart products are protected by a tax_rules_group having a
 * defined Corsican override.
 *
 * If `postcode`/`countryId` do not match any range, returns `taxRates`
 * unchanged (no mutation, we return a new Map for safety).
 */
export async function applyCorseOverride(
  taxRates: Map<number, number>,
  productTaxGroups: Map<number, number>,
  postcode: string | null | undefined,
  countryId: number | null | undefined,
): Promise<Map<number, number>> {
  const cid = Number(countryId || DEFAULT_FR_COUNTRY_ID)
  const pc = String(postcode || '').trim()
  if (!pc || cid !== DEFAULT_FR_COUNTRY_ID) return new Map(taxRates)

  const rules = await loadRules()
  if (!rules.length) return new Map(taxRates)

  const matchingByGroup = new Map<number, number>()
  for (const rule of rules) {
    if (matchesCorseRange(rule, pc, cid)) {
      matchingByGroup.set(rule.id_tax_rules_group, Number(rule.rate_target) || 0)
    }
  }
  if (!matchingByGroup.size) return new Map(taxRates)

  const out = new Map<number, number>()
  taxRates.forEach((defaultRate, productId) => {
    const group = productTaxGroups.get(productId)
    const override = group != null ? matchingByGroup.get(group) : undefined
    out.set(productId, override != null ? override : defaultRate)
  })
  return out
}
