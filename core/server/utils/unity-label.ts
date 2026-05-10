/**
 *
 * Unique helper for mapping `ps_product.unity` (free text entered by the
 * merchant in the PrestaShop admin interface, e.g. "Per kg", "Per L", "Per piece")
 * to a short suffix on the UI side (`HT/K`, `HT/L`, `HT/U`).
 *
 * DB-First doctrine: the label comes from the DB, never hardcoded in templates
 * (cf. fix 2026-05-06 — one store has 99% "Per kg" but other stores
 * could have "Per L" / "Per piece" without modifying the Nuxt code).
 */

/**
 * Maps a `unity` text (admin input) to a short unit price suffix.
 * - "Par kg" / "Par kilo" / "kg" → "HT/K"
 * - "Par L" / "Par litre"        → "HT/L"
 * - "Per piece" / "Per unit"    → "HT/U"
 * - empty / unknown               → "HT" (no unit suffix)
 */
export function unityToShortLabel(unity: string | null | undefined): string {
  const u = String(unity || '').trim().toLowerCase()
  if (!u) return 'HT'
  if (/(?:^|[^a-z])(kil|kg)/.test(u)) return 'HT/K'
  if (/(?:^|[^a-z])(litre|^l$|\bl\b)/.test(u)) return 'HT/L'
  if (/(?:^|[^a-z])(unit|pi[èe]ce|piece)/.test(u)) return 'HT/U'
  // Fallback : on respecte ce que le commerçant a saisi, en court.
  return `HT/${unity}`
}

/**
 * Decides what to display as "unit" price on the card / product sheet / cart,
 * by reading DB-first standard PrestaShop fields plus custom project features.
 *
 * Inference rules (in order of priority):
 * 1. Multi-pack (`Units per package > 1`) → price PER PIECE/BAG, suffix HT/U.
 *      Cas Meyva Coco 12×200g : 21,48 € colis ÷ 12 = 1,79 € HT/U
 * (the price per kg is misleading for the customer who buys by the piece).
 * 2. Otherwise `unit_price_ratio > 0` (native PrestaShop field) → price PER UNIT OF MEASURE,
 * suffix derived from `p.unity` (HT/K, HT/L…). The merchant enters ratio + unity in the admin interface.
 *      Cas Lucques 3 kg : 36,45 € ÷ 2,4 = 12,15 € HT/K
 * 3. Otherwise `Net weight` × `Units per package` (custom features) → fallback HT/K
 *   4. Sinon `p.weight` (poids colis brut) → fallback HT/K
 *
 * Returns `undefined` if no derivation makes sense (neither multi-pack nor
 * weight) — the UI then displays just the package price.
 */
export interface UnitPricingInputs {
  /** Prix HT colis (après promo si applicable). */
  priceHT: number
  /** `ps_product.unit_price_ratio` */
  unitPriceRatio?: number | null
  /** `ps_product.unity` (texte libre BO) */
  unity?: string | null
  /** Feature "Units per package" (multi-pack if > 1). */
  unitsPerPack?: number | null
  /** Feature "Net weight" already parsed in kg. */
  netWeightKg?: number | null
  /** `ps_product.weight` colis (kg). */
  productWeightKg?: number | null
}

export interface UnitPricingResult {
  /** Price per unit (kg, L, piece…) — raw. */
  pricePerUnit: number | undefined
  /** Short suffix to display after the price. */
  unitLabel: string
  /** Divisor applied to the package price (useful for recalculating the unit price
   * of a promotion: `pricePromoRaw / divisor`). */
  divisor: number | undefined
}

export function deriveUnitPricing(inp: UnitPricingInputs): UnitPricingResult {
  const { priceHT } = inp
  const unitsPerPack = Number(inp.unitsPerPack || 0)
  const unitPriceRatio = Number(inp.unitPriceRatio || 0)
  const productWeightKg = Number(inp.productWeightKg || 0)
  const netWeightKg = Number(inp.netWeightKg || 0)

  // 1. Multi-pack → price per unit (bag/piece).
  if (unitsPerPack > 1) {
    return { pricePerUnit: priceHT / unitsPerPack, unitLabel: 'HT/U', divisor: unitsPerPack }
  }

  // 2. Champ PS natif unit_price_ratio + unity (Par kg / Par L…).
  if (unitPriceRatio > 0) {
    return {
      pricePerUnit: priceHT / unitPriceRatio,
      unitLabel: unityToShortLabel(inp.unity),
      divisor: unitPriceRatio,
    }
  }

  // 3-4. Weight fallback (always in kg).
  const totalKg = netWeightKg > 0 ? netWeightKg : (productWeightKg > 0 ? productWeightKg : 0)
  if (totalKg > 0) {
    return { pricePerUnit: priceHT / totalKg, unitLabel: 'HT/K', divisor: totalKg }
  }

  return { pricePerUnit: undefined, unitLabel: 'HT', divisor: undefined }
}
