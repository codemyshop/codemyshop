/**
 *
 * Feature Flags multi-tenant.
 *
 * Single source of truth (DB-Only doctrine 2026-04-19):
 * cs_marketplace_feature + cs_marketplace_tenant, read/written via the
 * facade `~/modules/marketplace/server/utils/marketplace` (Drizzle PG).
 *
 * Reads (readCatalog, getTenantEnabledFeatures, isFeatureEnabled) and
 * writes (enableFeature, disableFeature) go DIRECTLY to DB —
 * no duplicate source, no more HTTP calls to the PrestaShop module (php-eviction-phase1
 * 2026-05-01, old fallback `togglePsModule` removed).
 */

import {
  listCatalogForTenant,
  listEnabledFeatureIds,
  toggleFeatureForTenant,
  isFeatureEnabled as isFeatureEnabledDb,
} from '~/modules/marketplace/server/utils/marketplace'

export interface CatalogFeature {
  id:            string   // feature_id dans la DB
  name:          string
  description:   string
  icon:          string
  category:      string
  monthlyPrice:  number
  status:        'stable' | 'beta' | 'planned'
  badge?:        string
  route?:        string
  enabled?:      boolean
}

export async function readCatalog(clientId?: string): Promise<CatalogFeature[]> {
  const cid = clientId || 'ac-hub'
  try {
    const rows = await listCatalogForTenant(cid, { clientId: cid })
    return rows.map((f) => ({
      id:           f.feature_id,
      name:         f.name,
      description:  f.description || '',
      icon:         f.icon || '⚙️',
      category:     f.category,
      monthlyPrice: Number(f.monthly_price) || 0,
      status:       (f.status || 'stable') as 'stable' | 'beta' | 'planned',
      badge:        f.badge || undefined,
      route:        f.route || undefined,
      enabled:      Number(f.enabled) === 1,
    }))
  } catch (e) {
    console.warn('[feature-flags] readCatalog échec:', e)
    return []
  }
}

export async function getTenantEnabledFeatures(clientId: string): Promise<string[]> {
  try {
    return await listEnabledFeatureIds(clientId, { clientId })
  } catch (e) {
    console.warn('[feature-flags] getTenantEnabledFeatures échec:', e)
    return []
  }
}

export async function isFeatureEnabled(clientId: string, featureId: string): Promise<boolean> {
  try {
    return await isFeatureEnabledDb(clientId, featureId, { clientId })
  } catch {
    return false
  }
}

export async function enableFeature(clientId: string, featureId: string): Promise<void> {
  await toggleFeatureForTenant(clientId, featureId, true, { clientId })
}

export async function disableFeature(clientId: string, featureId: string): Promise<void> {
  await toggleFeatureForTenant(clientId, featureId, false, { clientId })
}
