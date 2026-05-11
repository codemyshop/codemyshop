

import { sql } from 'drizzle-orm'
import { usePocPg } from '../db/drizzle-pg'

const DEFAULT_FR_COUNTRY_ID = 8

interface CorseOverrideRow {
  id_tax_rules_group: number
  id_country: number
  zipcode_from: string
  zipcode_to: string
  id_tax_target: number
  rate_target: number | string
}

let cachedRules: CorseOverrideRow[] | null = null
let cachedAt = 0
const CACHE_TTL_MS = 60_000 

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

export function invalidateCorseCache(): void {
  cachedRules = null
  cachedAt = 0
}

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
