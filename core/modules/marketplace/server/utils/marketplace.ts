/**
 *
 * Marketplace facade — multi-tenant feature flags + design system.
 * Sources :
 * - `cs_marketplace_feature` : catalog (read by all tenants — local copy
 * seeded via sync-modules-tenant.sh + upgrade hooks)
 *  - `cs_marketplace_tenant`  : asso client_id × feature_id (active toggle)
 * - `cs_marketplace_design_system` : shared design tokens (infrequent reads)
 *
 * Surface :
 * - listCatalogForTenant (catalog + enabled flag per tenant via EXISTS)
 * - listEnabledFeatureIds (only active IDs for this tenant)
 *  - toggleFeatureForTenant (upsert active 0/1)
 * - getFeatureIdByRoute (per-route playbook resolution)
 * - isFeatureEnabled (direct lookup of a single flag)
 *
 * Task #38/#44 — MariaDB removal: 100% PostgreSQL facade
 * (cs_main, single source of truth runtime).
 */

import { sql } from 'drizzle-orm'
import { usePocPg } from '../../../../server/db/drizzle-pg'

// Le contexte est conservé pour compatibilité de signature, mais ignoré : la
// façade tape directement le pool PG cs_main (single-tenant runtime).
interface MarketplaceContext {
  event?: any
  clientId?: string
}

export interface CatalogFeatureRow {
  feature_id: string
  name: string
  description: string | null
  icon: string
  category: string
  monthly_price: number
  status: string
  badge: string | null
  route: string | null
  position: number
  enabled: number
}

/**
 * Full catalog visible to the tenant (filter `ac_only` = 0 except if client = 'ac-hub').
 * The `enabled` flag reflects the association `cs_marketplace_tenant.active = 1`.
 */
export async function listCatalogForTenant(
  clientId: string,
  _ctx: MarketplaceContext = {},
): Promise<CatalogFeatureRow[]> {
  const rows = await usePocPg().execute<any>(sql`
    SELECT
      f.feature_id,
      f.name,
      f.description,
      f.icon,
      f.category,
      f.monthly_price,
      f.status,
      f.badge,
      f.route,
      f.position,
      CASE WHEN EXISTS(
        SELECT 1 FROM cs_main.cs_marketplace_tenant t
        WHERE t.client_id = ${clientId} AND t.feature_id = f.feature_id AND t.active = 1
      ) THEN 1 ELSE 0 END AS "enabled"
    FROM cs_main.cs_marketplace_feature f
    WHERE f.active = 1
      AND (f.ac_only = 0 OR ${clientId} = 'ac-hub')
    ORDER BY f.category ASC, f.position ASC, f.feature_id ASC
  `)
  return (rows as any[]).map((r) => ({
    feature_id: String(r.feature_id),
    name: String(r.name),
    description: r.description,
    icon: String(r.icon || ''),
    category: String(r.category),
    monthly_price: Number(r.monthly_price || 0),
    status: String(r.status || 'stable'),
    badge: r.badge,
    route: r.route,
    position: Number(r.position || 0),
    enabled: Number(r.enabled || 0),
  }))
}

export async function listEnabledFeatureIds(
  clientId: string,
  _ctx: MarketplaceContext = {},
): Promise<string[]> {
  const rows = await usePocPg().execute<any>(sql`
    SELECT feature_id FROM cs_main.cs_marketplace_tenant
    WHERE client_id = ${clientId} AND active = 1
  `)
  return (rows as any[]).map((r) => String(r.feature_id))
}

export async function toggleFeatureForTenant(
  clientId: string,
  featureId: string,
  active: boolean,
  _ctx: MarketplaceContext = {},
): Promise<void> {
  // Pas de contrainte UNIQUE (client_id, feature_id) côté PG cs_main
  // (à ajouter via upgrade hook ac_marketplace ultérieur). Pattern UPDATE-then-INSERT
  // sémantiquement équivalent à ON DUPLICATE KEY UPDATE.
  const activeInt = active ? 1 : 0
  const updated = await usePocPg().execute<any>(sql`
    UPDATE cs_main.cs_marketplace_tenant
       SET active = ${activeInt}, date_upd = NOW()
     WHERE client_id = ${clientId} AND feature_id = ${featureId}
     RETURNING id_tenant_feature
  `)
  if ((updated as any[]).length > 0) return

  await usePocPg().execute(sql`
    INSERT INTO cs_main.cs_marketplace_tenant
        (client_id, feature_id, active, date_add, date_upd)
    VALUES (${clientId}, ${featureId}, ${activeInt}, NOW(), NOW())
  `)
}

export async function isFeatureEnabled(
  clientId: string,
  featureId: string,
  _ctx: MarketplaceContext = {},
): Promise<boolean> {
  const rows = await usePocPg().execute<any>(sql`
    SELECT 1 FROM cs_main.cs_marketplace_tenant
    WHERE client_id = ${clientId} AND feature_id = ${featureId} AND active = 1
    LIMIT 1
  `)
  return (rows as any[]).length > 0
}

/**
 * Resolves the feature linked to a route (exact match, ignores querystring/trailing slash).
 * Used by playbooks/by-route.get to link a playbook to an admin screen.
 */
export async function getFeatureIdByRoute(
  route: string,
  _ctx: MarketplaceContext = {},
): Promise<string | null> {
  const cleanPath = route.split('?')[0].replace(/\/+$/, '') || '/'
  const rows = await usePocPg().execute<any>(sql`
    SELECT feature_id FROM cs_main.cs_marketplace_feature
    WHERE route = ${cleanPath} AND active = 1
    LIMIT 1
  `)
  const r = (rows as any[])[0]
  return r ? String(r.feature_id) : null
}
