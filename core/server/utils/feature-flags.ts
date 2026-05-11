

import {
  listCatalogForTenant,
  listEnabledFeatureIds,
  toggleFeatureForTenant,
  isFeatureEnabled as isFeatureEnabledDb,
} from '~/modules/marketplace/server/utils/marketplace'

export interface CatalogFeature {
  id:            string   
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
