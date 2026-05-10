/**
 *
 * Marketplace module manifest — back-office UI subdomain.
 * Drizzle schema + complete facade (catalog/enabled/toggle/byRoute/isEnabled).
 * No direct API endpoint on the Nuxt side: the facade is consumed by
 *   - core/server/utils/feature-flags.ts (lecture catalog + toggle DB fallback)
 * - core/server/api/bo/playbooks/by-route.get.ts (feature ↔ route resolution)
 * Tenant-side writes continue to go through the HTTP module
 * to trigger install/uninstall, with database fallback via the facade.
 */
import type { ModuleManifest } from '../../server/db/schema-pg/module-registry'

export const AcMarketplaceManifest: ModuleManifest = {
  routes: {},
  hooks: [],
  deps: ['drizzle-orm', 'mysql2'],
  tables: [
    'cs_marketplace_feature',
    'cs_marketplace_tenant',
    'cs_marketplace_design_system',
  ],
}
