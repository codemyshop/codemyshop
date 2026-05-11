

export function unityToShortLabel(unity: string | null | undefined): string {
  const u = String(unity || '').trim().toLowerCase()
  if (!u) return 'HT'
  if (/(?:^|[^a-z])(kil|kg)/.test(u)) return 'HT/K'
  if (/(?:^|[^a-z])(litre|^l$|\bl\b)/.test(u)) return 'HT/L'
  if (/(?:^|[^a-z])(unit|pi[èe]ce|piece)/.test(u)) return 'HT/U'
  
  return `HT/${unity}`
}

export interface UnitPricingInputs {
  
  priceHT: number
  
  unitPriceRatio?: number | null
  
  unity?: string | null
  
  unitsPerPack?: number | null
  
  netWeightKg?: number | null
  
  productWeightKg?: number | null
}

export interface UnitPricingResult {
  
  pricePerUnit: number | undefined
  
  unitLabel: string
  

  divisor: number | undefined
}

export function deriveUnitPricing(inp: UnitPricingInputs): UnitPricingResult {
  const { priceHT } = inp
  const unitsPerPack = Number(inp.unitsPerPack || 0)
  const unitPriceRatio = Number(inp.unitPriceRatio || 0)
  const productWeightKg = Number(inp.productWeightKg || 0)
  const netWeightKg = Number(inp.netWeightKg || 0)

  
  if (unitsPerPack > 1) {
    return { pricePerUnit: priceHT / unitsPerPack, unitLabel: 'HT/U', divisor: unitsPerPack }
  }

  
  if (unitPriceRatio > 0) {
    return {
      pricePerUnit: priceHT / unitPriceRatio,
      unitLabel: unityToShortLabel(inp.unity),
      divisor: unitPriceRatio,
    }
  }

  
  const totalKg = netWeightKg > 0 ? netWeightKg : (productWeightKg > 0 ? productWeightKg : 0)
  if (totalKg > 0) {
    return { pricePerUnit: priceHT / totalKg, unitLabel: 'HT/K', divisor: totalKg }
  }

  return { pricePerUnit: undefined, unitLabel: 'HT', divisor: undefined }
}
