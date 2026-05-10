/**
 * Resolves the commercial tier of a tenant — used by the module loader
 * to decide which enterprise modules are active.
 *
 * Tables source : cs_client_vps + cs_marketplace_tenant (legacy
 * preserved on the private side). The tier-5 scrubber of the OSS sync rewrites cs_*
 * → cs_* automatically, so the public repo will see the cs_* convention.
 *
 * Chantier codemyshop-oss Phase 1.2 (2026-05-10).
 */
import { sql } from 'drizzle-orm'
import { usePocPg } from '~/server/db/drizzle-pg'
import type { Tier } from '~/types/module-manifest'

interface TenantInfo {
  tier: Tier
  marketplaceAddons: string[]
  isInternalTenant: boolean
}

const cache = new Map<string, { value: TenantInfo, expiresAt: number }>()
const CACHE_TTL_MS = 60_000  // 1 min

export async function resolveTenantInfo(clientId: string): Promise<TenantInfo> {
  const now = Date.now()
  const cached = cache.get(clientId)
  if (cached && cached.expiresAt > now) return cached.value

  // Lookup tier via cs_client_vps.offer ('starter' | 'premium') mappé
  // sur le modèle 5 paliers. Une colonne tier dédiée pourra être ajoutée
  // plus tard pour découpler offer (legacy 2 valeurs) de tier (5 valeurs).
  let tier: Tier = 'community'
  try {
    const rows = await usePocPg().execute<{ offer: string | null }>(sql`
      SELECT offer FROM cs_client_vps WHERE client_id = ${clientId} LIMIT 1
    `)
    const offer = (rows as any[])[0]?.offer
    if (offer === 'premium')      tier = 'pro'
    else if (offer === 'starter') tier = 'starter'
    else if (offer === 'growth')  tier = 'growth'
    else if (offer === 'custom')  tier = 'custom'
  } catch (err: any) {
    console.warn(`[tier-resolver] cs_client_vps lookup failed for ${clientId}: ${err?.message}`)
  }

  // Marketplace add-ons activés
  let marketplaceAddons: string[] = []
  try {
    const rows = await usePocPg().execute<{ feature_id: string }>(sql`
      SELECT feature_id FROM cs_marketplace_tenant
      WHERE client_id = ${clientId} AND active = 1
    `)
    marketplaceAddons = (rows as any[]).map((r) => r.feature_id)
  } catch (err: any) {
    console.warn(`[tier-resolver] marketplace lookup failed for ${clientId}: ${err?.message}`)
  }

  // Internal tenant : convention = client_id 'ac-hub' (à formaliser via
  // une colonne is_internal_tenant plus tard).
  const isInternalTenant = clientId === 'ac-hub'

  const info: TenantInfo = { tier, marketplaceAddons, isInternalTenant }
  cache.set(clientId, { value: info, expiresAt: now + CACHE_TTL_MS })
  return info
}

/** Invalide le cache (à appeler depuis les webhooks Stripe / admin marketplace). */
export function invalidateTenantCache(clientId: string): void {
  cache.delete(clientId)
}
