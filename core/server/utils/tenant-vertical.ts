/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * Helper to read the business vertical of a tenant — conditions the calculations
 * specific to each vertical (price/kg, reduced VAT, batches/expiry date, etc.).
 *
 * Single source of truth: `runtimeConfig.public.vertical` declared in nuxt.config.ts
 * of each tenant.
 *
 * Supported verticals:
 * - 'food'    : Example Shop (dried fruits wholesaler) — price/kg calculation enabled,
 * 5.5% VAT by default, batches/expiry date, variable weight.
 * - 'fashion' : demo store (skate shop) — simple unit price, no
 * price/kg calculation, 20% VAT by default.
 * - 'general' : standard ecommerce (default case if not declared).
 *
 * Do not derive the vertical from clientId — that would be tenant hardcoding
 * that we're trying to eliminate (see the scaling initiative).
 */

export type TenantVertical = 'food' | 'fashion' | 'general'

export function getTenantVertical(event?: any): TenantVertical {
  try {
    const cfg = useRuntimeConfig(event)
    const v = String((cfg.public as any)?.vertical || '').toLowerCase()
    if (v === 'food' || v === 'fashion') return v
  } catch { /* fallback */ }
  return 'general'
}

/** True if the tenant enables price/kg calculation + HT/K label. */
export function tenantHasUnitPricing(event?: any): boolean {
  return getTenantVertical(event) === 'food'
}
