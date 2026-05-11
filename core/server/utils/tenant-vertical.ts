

export type TenantVertical = 'food' | 'fashion' | 'general'

export function getTenantVertical(event?: any): TenantVertical {
  try {
    const cfg = useRuntimeConfig(event)
    const v = String((cfg.public as any)?.vertical || '').toLowerCase()
    if (v === 'food' || v === 'fashion') return v
  } catch {  }
  return 'general'
}

export function tenantHasUnitPricing(event?: any): boolean {
  return getTenantVertical(event) === 'food'
}
